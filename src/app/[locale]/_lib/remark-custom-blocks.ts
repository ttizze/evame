import type { Paragraph, Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { BLOCK_TYPE_TO_CLASS, isValidBlockType } from "./custom-block-types";

/**
 * カスタムブロック記法を解釈するremarkプラグイン
 *
 * 記法:
 * - ::gatha1\n...\n:: → <p class="gatha1">
 * - ::gatha2\n...\n:: → <p class="gatha2">
 * - ::gatha3\n...\n:: → <p class="gatha3">
 * - ::gathalast\n...\n:: → <p class="gathalast">
 * - ::indent\n...\n:: → <p class="indent">
 * - ::unindented\n...\n:: → <p class="unindented">
 * - ::centre\n...\n:: → <p class="centre">
 * - ::hangnum\n...\n:: → <p class="hangnum">
 */
export const remarkCustomBlocks: Plugin<[], Root> = () => (tree: Root) => {
	visit(tree, "paragraph", (paragraph: Paragraph, index, parent) => {
		if (!parent || typeof index !== "number") return;

		if (paragraph.children.length !== 1) return;
		const onlyChild = paragraph.children[0];
		if (!onlyChild || onlyChild.type !== "text") return;

		const textNode = onlyChild as Text;
		const value = textNode.value;

		const blockMatch = /^::(\w+)\n([\s\S]*?)\n::$/m.exec(value);
		if (!blockMatch) return;

		const [, blockType, content] = blockMatch;
		const transformed = transformCustomBlock(blockType, content.trim());
		if (!transformed) return;

		(parent.children as Paragraph[]).splice(index, 1, transformed);
	});
};

function transformCustomBlock(
	blockType: string,
	content: string,
): Paragraph | null {
	if (!isValidBlockType(blockType)) {
		return null;
	}

	return {
		type: "paragraph",
		children: [{ type: "text", value: content }],
		data: {
			hProperties: {
				class: BLOCK_TYPE_TO_CLASS[blockType],
			},
		},
	};
}
