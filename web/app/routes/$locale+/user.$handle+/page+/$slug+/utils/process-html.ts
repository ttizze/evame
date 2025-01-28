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

interface BlockInfo {
	element: Element;
	text: string;
	textAndOccurrenceHash: string;
}

export interface BlockWithNumber {
	element: Element;
	text: string;
	textAndOccurrenceHash: string;
	number: number;
}

export function collectBlocksFromRoot(
	root: Root,
	title?: string,
): BlockWithNumber[] {
	const textOccurrenceMap: Map<string, number> = new Map();
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

	// 上から順に連番を振る
	const numberedBlocks = blocks.map((block, index) => ({
		...block,
		number: index + 1,
	}));

	// タイトルがあれば 0 番で先頭に追加
	// 同じ文字列がテクスト中に出現する場合を考慮し、countは0にしておく
	if (title) {
		numberedBlocks.unshift({
			element: {} as Element, // ダミー
			text: title,
			textAndOccurrenceHash: generateHashForText(title, 0),
			number: 0,
		});
	}

	return numberedBlocks;
}

export function injectSpanNodes(blocks: BlockWithNumber[]) {
	for (const block of blocks) {
		const number = block.number;
		const spanNode: Element = {
			type: "element",
			tagName: "span",
			properties: {
				"data-number-id": number.toString(),
			},
			children: block.element.children,
		};

		block.element.children = [spanNode];
	}
}
