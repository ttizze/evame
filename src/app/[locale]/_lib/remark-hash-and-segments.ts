/**
 * remark プラグイン: MDAST からセグメントを生成し、安定ハッシュ/番号/メタデータを付与する。
 * - header があれば 0 番のセグメントとして先頭に追加
 * - ブロック要素（段落/見出し/リスト項目/引用/表セル）を 1 セグメントとして抽出（ネストは除外）
 * - {para:n} を locators に、<span class="pb" ...> を metadata.items に格納
 * - 同一テキストでも出現回数込みで一意なハッシュを生成
 * - ノードには HTML 変換用の data-number-id を付与
 * 備考: locale はここでは扱わない
 */
import type { Segment } from "@prisma/client";
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
import { generateHashForText } from "./generate-hash-for-text";
/* ---------- 共通型 ---------- */

export type SegmentDraft = Omit<
	Segment,
	"id" | "contentId" | "createdAt" | "segmentTypeId"
> & {
	metadata?: { items: Array<{ typeKey: string; value: string }> };
	locators?: Array<{ system: "VRI_PARAGRAPH"; value: string }>;
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
		visit(tree, isBlockNode, (node) => {
			/* ネストしたブロック要素は除外 */
			if (hasNestedBlock(node)) return;

			/* テキスト抽出 */
			let text = extractText(node);
			if (!text) return;

			/* 段落番号とページブレークを抽出 */
			const metadata: Array<{ typeKey: string; value: string }> = [];
			const locatorValues: string[] = [];

			// 段落番号の抽出: {para:n} (まだ変換されていない場合)
			const paraMatch = text.match(/^\{para:([^}]+)\}\s*/);
			if (paraMatch) {
				locatorValues.push(paraMatch[1]);
				text = text.slice(paraMatch[0].length);
			}

			// ページブレークの抽出: HTMLノードから抽出（remark-custom-blocksで変換済み）
			const pageBreaks = extractPageBreaksFromNode(node);
			metadata.push(...pageBreaks);

			// メタデータ記法をテキストから削除（まだ変換されていない場合）
			text = text
				.replace(/^\{para:[^}]+\}\s*/g, "")
				.replace(/\{pb:[^}]+\}/g, "")
				.replace(/\{pb\}/g, "")
				.trim();

			if (!text) return;

			/* ハッシュ生成と出現回数を追跡 */
			const textAndOccurrenceHash = generateHashAndTrackOccurrence(
				text,
				occurrenceMap,
			);

			/* HTML 変換時用の data-number-id を付与 */
			setNodeDataNumber(node, number);

			f.data.segments.push({
				textAndOccurrenceHash,
				text,
				number,
				metadata: metadata.length > 0 ? { items: metadata } : undefined,
				locators:
					locatorValues.length > 0
						? locatorValues.map((value) => ({
								system: "VRI_PARAGRAPH" as const,
								value,
							}))
						: undefined,
			});
			number += 1;
		});
	};
