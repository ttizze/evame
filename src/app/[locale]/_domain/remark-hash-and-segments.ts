/**
 * remark プラグイン: MDAST からセグメントを生成し、安定ハッシュ/番号/メタデータを付与する。
 * - header があれば 0 番のセグメントとして先頭に追加
 * - ブロック要素（段落/見出し/リスト項目/引用/表セル）を 1 セグメントとして抽出（ネストは除外）
 * - {para:n} を paragraphNumber に、<span class="pb" ...> を metadata.items に格納
 * - 同一テキストでも出現回数込みで一意なハッシュを生成
 * - ノードには HTML 変換用の data-number-id を付与
 * 備考: locale はここでは扱わない
 */

import type {
	Blockquote,
	Heading,
	Html,
	ListItem,
	Node,
	Paragraph,
	Root,
	RootContent,
	TableCell,
} from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Data, VFile } from "vfile";
import type { Segment } from "@/drizzle/types";
import { generateHashForText } from "../_utils/generate-hash-for-text";
/* ---------- 共通型 ---------- */

export type SegmentDraft = Omit<
	Segment,
	"id" | "contentId" | "createdAt" | "segmentTypeId"
> & {
	metadata?: { items: Array<{ typeKey: string; value: string }> };
	paragraphNumber?: string;
};

/* mdast で「1 ブロック」とみなすノード型 */
type BlockNode = Paragraph | Heading | ListItem | Blockquote | TableCell;

const BLOCK_TYPES: ReadonlyArray<BlockNode["type"]> = [
	"paragraph",
	"heading",
	"listItem",
	"blockquote",
	"tableCell",
] as const;

const PARA_NOTATION_REGEX = /^\{para:([^}]+)\}\s*/;

const canonicalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

interface SegmentData extends Data {
	segments: SegmentDraft[];
}

/* ---------- ヘルパー関数 ---------- */

function isBlockNode(node: Node): node is BlockNode {
	return BLOCK_TYPES.includes(node.type as BlockNode["type"]);
}

function hasNestedBlock(node: BlockNode): boolean {
	if (!("children" in node)) return false;
	return (node.children as RootContent[]).some((child) => isBlockNode(child));
}

function extractText(node: BlockNode): string {
	return mdastToString(node, { includeImageAlt: false }).trim();
}

function extractPageBreaksFromNode(node: BlockNode): Array<{
	typeKey: string;
	value: string;
}> {
	const pageBreaks: Array<{ typeKey: string; value: string }> = [];
	if (!("children" in node)) return pageBreaks;

	for (const child of node.children) {
		if (child.type === "html") {
			const htmlNode = child as Html;
			const html = htmlNode.value;
			// <span class="pb" data-ed="..." data-n="..."></span> を抽出
			const pbMatch = html.match(
				/<span\s+class="pb"\s+data-ed="([^"]+)"\s+data-n="([^"]+)"><\/span>/,
			);
			if (pbMatch) {
				const edition = pbMatch[1].toUpperCase();
				const pageCode = pbMatch[2];
				const editionMap: Record<string, string> = {
					V: "VRI",
					M: "MYANMAR",
					P: "PTS",
					T: "THAI",
					O: "OTHER",
					OTHER: "OTHER",
				};
				const normalizedEdition = editionMap[edition] || edition;
				pageBreaks.push({
					typeKey: `${normalizedEdition}_PAGEBREAK`,
					value: pageCode,
				});
			}
		}
	}
	return pageBreaks;
}

function setNodeDataNumber(node: BlockNode, number: number): void {
	if (node.data === undefined) {
		node.data = {};
	}
	const data = node.data as Data & {
		hProperties?: Record<string, unknown>;
	};
	if (data.hProperties === undefined) {
		data.hProperties = {};
	}
	(data.hProperties as Record<string, string>)["data-number-id"] =
		number.toString();
}

function generateHashAndTrackOccurrence(
	text: string,
	occurrenceMap: Map<string, number>,
): string {
	const canonicalizedText = canonicalize(text);
	const occurrence = (occurrenceMap.get(canonicalizedText) ?? 0) + 1;
	occurrenceMap.set(canonicalizedText, occurrence);
	return generateHashForText(text, occurrence);
}

function stripParagraphNotationFromNode(node: BlockNode): void {
	if (!("children" in node)) return;
	const children = node.children as RootContent[];
	for (let i = 0; i < children.length; i += 1) {
		const child = children[i];
		if (child.type !== "text") continue;
		const newValue = child.value.replace(PARA_NOTATION_REGEX, "");
		if (newValue === child.value) {
			return;
		}
		if (newValue.length > 0) {
			child.value = newValue;
		} else {
			children.splice(i, 1);
		}
		return;
	}
}

/**
 * ブロックノードから段落番号を抽出し、テキストから削除する
 */
function extractParagraphNumber(
	text: string,
	node: BlockNode,
): { paragraphNumber: string | null; cleanedText: string } {
	const paraMatch = text.match(PARA_NOTATION_REGEX);
	if (!paraMatch) {
		return { paragraphNumber: null, cleanedText: text };
	}

	let paragraphNumber = paraMatch[1];
	// 範囲形式（例：「1-5」）の場合は、最後の数字（5）を取得
	if (paragraphNumber.includes("-")) {
		const parts = paragraphNumber.split("-");
		paragraphNumber = parts[parts.length - 1];
	}

	stripParagraphNotationFromNode(node);
	const cleanedText = text.slice(paraMatch[0].length);

	return { paragraphNumber, cleanedText };
}

/**
 * ブロックノードからセグメント情報を抽出してセグメントドラフトを作成する
 * @returns セグメントドラフトと更新された段落番号のタプル
 */
function createSegmentFromBlockNode(
	node: BlockNode,
	number: number,
	currentParagraphNumber: string | null,
	occurrenceMap: Map<string, number>,
): { segment: SegmentDraft | null; updatedParagraphNumber: string | null } {
	// ネストしたブロック要素は除外
	if (hasNestedBlock(node)) {
		return { segment: null, updatedParagraphNumber: currentParagraphNumber };
	}

	// テキスト抽出
	let text = extractText(node);
	if (!text) {
		return { segment: null, updatedParagraphNumber: currentParagraphNumber };
	}

	// 段落番号とページブレークを抽出
	const metadata: Array<{ typeKey: string; value: string }> = [];
	const isHeading = "depth" in node;

	// 段落番号の抽出と更新
	const { paragraphNumber: paragraphNumberFromBlock, cleanedText } =
		extractParagraphNumber(text, node);
	const updatedParagraphNumber =
		paragraphNumberFromBlock ?? currentParagraphNumber;
	const effectiveParagraphNumber =
		paragraphNumberFromBlock ?? currentParagraphNumber;

	// ページブレークの抽出
	const pageBreaks = extractPageBreaksFromNode(node);
	metadata.push(...pageBreaks);

	// メタデータ記法をテキストから削除
	text = cleanedText
		.replace(PARA_NOTATION_REGEX, "")
		.replace(/\{pb:[^}]+\}/g, "")
		.replace(/\{pb\}/g, "")
		.trim();

	if (!text) {
		return {
			segment: null,
			updatedParagraphNumber: updatedParagraphNumber,
		};
	}

	// ハッシュ生成と出現回数を追跡
	const textAndOccurrenceHash = generateHashAndTrackOccurrence(
		text,
		occurrenceMap,
	);

	// HTML 変換時用の data-number-id を付与
	setNodeDataNumber(node, number);

	// ヘッダー（見出し）の場合は段落番号を付けない
	const paragraphNumber =
		!isHeading && effectiveParagraphNumber !== null
			? effectiveParagraphNumber
			: undefined;

	return {
		segment: {
			textAndOccurrenceHash,
			text,
			number,
			metadata: metadata.length > 0 ? { items: metadata } : undefined,
			paragraphNumber,
		},
		updatedParagraphNumber: updatedParagraphNumber,
	};
}

/* ---------- プラグイン本体 ---------- */

export const remarkHashAndSegments =
	(header?: string): Plugin<[], Root> =>
	() =>
	(tree: Root, file: VFile) => {
		/* data.segments を型安全に初期化 */
		const f = file as typeof file & { data: SegmentData };
		f.data.segments ??= [];

		const occurrenceMap = new Map<string, number>();
		let number = 1; // 0 はタイトル用、本文は 1 から

		/* ── 0. タイトル ─────────────────── */
		if (header?.trim()) {
			const textAndOccurrenceHash = generateHashForText(header, 0);
			f.data.segments.push({
				textAndOccurrenceHash,
				text: header,
				number: 0,
			});
			occurrenceMap.set(canonicalize(header), 0);
		}

		/* ── 1. 本文ブロック ─────────────── */
		// 段落番号に基づいてセグメントをグループ化するため、現在の段落番号を追跡
		let currentParagraphNumber: string | null = null;

		visit(tree, isBlockNode, (node) => {
			const { segment, updatedParagraphNumber } = createSegmentFromBlockNode(
				node,
				number,
				currentParagraphNumber,
				occurrenceMap,
			);
			if (!segment) return;

			currentParagraphNumber = updatedParagraphNumber;
			f.data.segments.push(segment);
			number += 1;
		});
	};
