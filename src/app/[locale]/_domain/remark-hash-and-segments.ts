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
import type { Segment } from "@/db/types.helpers";
import { generateHashForText } from "../_utils/generate-hash-for-text";

export type SegmentDraft = Omit<Segment, "id" | "contentId" | "createdAt">;
type BlockNode = Paragraph | Heading | ListItem | Blockquote | TableCell;
const BLOCK_TYPES: ReadonlyArray<BlockNode["type"]> = [
	"paragraph",
	"heading",
	"listItem",
	"blockquote",
	"tableCell",
];
const canonicalize = (text: string) =>
	text.trim().toLowerCase().replace(/\s+/g, " ");
interface SegmentData extends Data {
	segments: SegmentDraft[];
}
function isBlockNode(node: Node): node is BlockNode {
	return BLOCK_TYPES.includes(node.type as BlockNode["type"]);
}

/** 本文ブロックに安定したハッシュ・番号を付け、翻訳用セグメントを生成する。 */
export const remarkHashAndSegments =
	(header?: string): Plugin<[], Root> =>
	() =>
	(tree: Root, file: VFile) => {
		const f = file as typeof file & { data: SegmentData };
		f.data.segments ??= [];
		const occurrenceMap = new Map<string, number>();
		let number = 1;
		if (header?.trim()) {
			f.data.segments.push({
				textAndOccurrenceHash: generateHashForText(header, 0),
				text: header,
				number: 0,
			});
			occurrenceMap.set(canonicalize(header), 0);
		}
		visit(tree, isBlockNode, (node: BlockNode) => {
			if (
				"children" in node &&
				(node.children as RootContent[]).some(isBlockNode)
			)
				return;
			const text = mdastToString(node, { includeImageAlt: false }).trim();
			if (!text) return;
			const canonicalText = canonicalize(text);
			const occurrence = (occurrenceMap.get(canonicalText) ?? 0) + 1;
			occurrenceMap.set(canonicalText, occurrence);
			node.data ??= {};
			const data = node.data as Data & {
				hProperties?: Record<string, unknown>;
			};
			data.hProperties ??= {};
			data.hProperties["data-number-id"] = number.toString();
			f.data.segments.push({
				textAndOccurrenceHash: generateHashForText(text, occurrence),
				text,
				number,
			});
			number += 1;
		});
	};
