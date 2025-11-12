import type { Segment } from "@prisma/client";
import type {
	Blockquote,
	Heading,
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
>;

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
			f.data.segments.push({ textAndOccurrenceHash, text: header, number: 0 });
			occurrenceMap.set(canonicalize(header), 0);
		}

		/* ── 1. 本文ブロック ─────────────── */
		visit(tree, isBlockNode, (node) => {
			/* ネストしたブロック要素は除外 */
			if (hasNestedBlock(node)) return;

			/* テキスト抽出 */
			const text = extractText(node);
			if (!text) return;

			/* ハッシュ生成と出現回数を追跡 */
			const textAndOccurrenceHash = generateHashAndTrackOccurrence(
				text,
				occurrenceMap,
			);

			/* HTML 変換時用の data-number-id を付与 */
			setNodeDataNumber(node, number);

			f.data.segments.push({ textAndOccurrenceHash, text, number });
			number += 1;
		});
	};
