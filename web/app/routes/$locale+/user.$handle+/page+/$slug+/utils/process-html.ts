import type { Element, Root, RootContent, Text } from "hast";
import type { Parent } from "unist";
import { visit } from "unist-util-visit";
import { generateHashForText } from "./generateHashForText";

const BLOCK_LEVEL_TAGS = new Set([
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li",
	"blockquote",
	"div",
	"section",
	"article",
	"td",
	"th",
	// 必要に応じて追加
]);

function extractTextFromHAST(node: Parent): string {
	let result = "";
	visit(node, "text", (textNode: RootContent) => {
		if (textNode.type === "text") {
			const trimmedText = (textNode as Text).value.trim();
			if (trimmedText) {
				// 空白で連結
				result += result ? ` ${trimmedText}` : trimmedText;
			}
		}
	});
	return result;
}

function hasBlockLevelChild(node: Element): boolean {
	return node.children.some((child) => {
		return child.type === "element" && BLOCK_LEVEL_TAGS.has(child.tagName);
	});
}

export interface BlockInfo {
	element: Element;
	text: string;
	textAndOccurrenceHash: string;
}

export function collectBlocksAndSegmentsFromRoot(root: Root, title?: string) {
	const textOccurrenceMap = new Map<string, number>();

	const blocks: BlockInfo[] = [];

	visit(root, "element", (node: Element) => {
		if (BLOCK_LEVEL_TAGS.has(node.tagName) && !hasBlockLevelChild(node)) {
			const blockText = extractTextFromHAST(node);
			if (!blockText) return;

			const currentCount = (textOccurrenceMap.get(blockText) ?? 0) + 1;
			textOccurrenceMap.set(blockText, currentCount);

			const hash = generateHashForText(blockText, currentCount);

			blocks.push({
				element: node,
				text: blockText,
				textAndOccurrenceHash: hash,
			});
		}
	});

	const segments = blocks.map((block, index) => ({
		text: block.text,
		textAndOccurrenceHash: block.textAndOccurrenceHash,
		number: index + 1,
	}));

	// タイトルを0番に追加
	if (title) {
		segments.unshift({
			text: title,
			textAndOccurrenceHash: generateHashForText(title, 0),
			number: 0,
		});
	}

	return { blocks, segments };
}
