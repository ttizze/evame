import { CodeNode } from "@lexical/code-core";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
	$convertToMarkdownString,
	$generateNodesFromMarkdownString,
	CHECK_LIST,
	HIGHLIGHT,
	TRANSFORMERS,
	type Transformer,
} from "@lexical/markdown";
import {
	$createHorizontalRuleNode,
	HorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
	$createTableCellNode,
	$createTableNode,
	$createTableRowNode,
	$isTableCellNode,
	$isTableRowNode,
	TableCellHeaderStates,
	TableCellNode,
	TableNode,
	TableRowNode,
} from "@lexical/table";
import {
	$create,
	$createParagraphNode,
	$getRoot,
	$getState,
	$isElementNode,
	$setState,
	type ElementNode,
} from "lexical";
import type { Root } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";
import {
	ImageNode,
	imageState,
	MarkdownSourceNode,
	sourceState,
	TweetNode,
	tweetState,
} from "./media-nodes";

const parser = unified().use(remarkParse).use(remarkGfm);
const markdownOptions = { extensions: [gfmToMarkdown()] };

export const editorNodes = [
	HeadingNode,
	QuoteNode,
	CodeNode,
	ListNode,
	ListItemNode,
	LinkNode,
	AutoLinkNode,
	TableNode,
	TableRowNode,
	TableCellNode,
	ImageNode,
	TweetNode,
	MarkdownSourceNode,
	HorizontalRuleNode,
];

const image: Transformer = {
	type: "text-match",
	dependencies: [ImageNode],
	importRegExp: /!\[/,
	regExp: /!\[(?:\\.|[^\]])*\]\((?:\\.|[^)])*\)$/,
	trigger: ")",
	export: (node) => {
		if (!(node instanceof ImageNode)) return null;
		const { src, alt, title } = $getState(node, imageState);
		return toMarkdown(
			{
				type: "root",
				children: [
					{
						type: "paragraph",
						children: [{ type: "image", url: src, alt, title }],
					},
				],
			},
			markdownOptions,
		).trim();
	},
	getEndIndex: (node, match) => {
		const start = match.index ?? 0;
		const first = parser.parse(node.getTextContent().slice(start)).children[0];
		const image = first?.type === "paragraph" ? first.children[0] : null;
		return image?.type === "image" && image.position?.end.offset !== undefined
			? start + image.position.end.offset
			: false;
	},
	replace: (node) => {
		const first = parser.parse(node.getTextContent()).children[0];
		if (first?.type !== "paragraph" || first.children[0]?.type !== "image")
			return;
		const { url, alt, title } = first.children[0];
		node.replace(
			$setState($create(ImageNode), imageState, {
				src: url,
				alt: alt ?? "",
				title: title ?? null,
			}),
		);
	},
};

const blocks: Transformer = {
	type: "element",
	dependencies: [TableNode, QuoteNode, MarkdownSourceNode, TweetNode],
	regExp: /$a/,
	replace: () => false,
	export: (node, exportChildren) => {
		if (node instanceof MarkdownSourceNode) return $getState(node, sourceState);
		if (node instanceof TweetNode) return $getState(node, tweetState);
		if (node instanceof QuoteNode)
			return (
				node
					.getChildren()
					.some((child) => $isElementNode(child) && !child.isInline())
					? $convertToMarkdownString(markdownTransformers, node)
					: exportChildren(node)
			)
				.split("\n")
				.map((line) => (line ? `> ${line}` : ">"))
				.join("\n");
		if (!(node instanceof TableNode)) return null;
		const rows = node.getChildren().filter($isTableRowNode);
		const firstCells = rows[0]?.getChildren().filter($isTableCellNode) ?? [];
		return toMarkdown(
			{
				type: "root",
				children: [
					{
						type: "table",
						align: firstCells.map((cell) => {
							const paragraph = cell.getFirstChild();
							const alignment = $isElementNode(paragraph)
								? paragraph.getFormatType()
								: null;
							return alignment === "left" ||
								alignment === "right" ||
								alignment === "center"
								? alignment
								: null;
						}),
						children: rows.map((row) => ({
							type: "tableRow",
							children: row
								.getChildren()
								.filter($isTableCellNode)
								.map((cell) => {
									const content: Root["children"] = parser.parse(
										$convertToMarkdownString(markdownTransformers, cell),
									).children;
									return {
										type: "tableCell",
										children: content.flatMap((part, index) => {
											const nodes =
												part.type === "paragraph"
													? part.children.map((child) =>
															child.type === "break"
																? { type: "html" as const, value: "<br>" }
																: child,
														)
													: [
															{
																type: "text" as const,
																value: toMarkdown(
																	{ type: "root", children: [part] },
																	markdownOptions,
																).trimEnd(),
															},
														];
											return index
												? [{ type: "html" as const, value: "<br>" }, ...nodes]
												: nodes;
										}),
									};
								}),
						})),
					},
				],
			},
			markdownOptions,
		).trim();
	},
};

export const markdownTransformers: Transformer[] = [
	blocks,
	image,
	CHECK_LIST,
	{
		type: "element",
		dependencies: [HorizontalRuleNode],
		regExp: /^(?:---|\*\*\*|___)\s$/,
		replace: (parent) => {
			parent.replace($createHorizontalRuleNode());
		},
		export: (node) => (node instanceof HorizontalRuleNode ? "---" : null),
	},
	...TRANSFORMERS.filter((transformer) => transformer !== HIGHLIGHT),
];

/** CommonMark/GFMのブロック境界をremarkで解析し、Lexicalへ取り込む。 */
export function importMarkdown(
	markdown: string,
	container: ElementNode = $getRoot(),
) {
	container.clear();
	const tree = parser.parse(markdown);
	visit(tree, "html", (node, index, parent) => {
		if (
			parent &&
			(parent.type === "paragraph" || parent.type === "tableCell") &&
			typeof index === "number" &&
			/^<br\s*\/?>$/i.test(node.value)
		)
			parent.children.splice(index, 1, { type: "break" });
	});
	for (const block of tree.children) {
		const source = toMarkdown(
			{ type: "root", children: [block] },
			markdownOptions,
		).trimEnd();
		if (block.type === "thematicBreak") {
			container.append($createHorizontalRuleNode());
			continue;
		}
		if (block.type === "blockquote") {
			const quote = $createQuoteNode();
			importMarkdown(
				toMarkdown({ type: "root", children: block.children }, markdownOptions),
				quote,
			);
			container.append(quote);
			continue;
		}
		if (block.type === "table") {
			const table = $createTableNode();
			for (const [rowIndex, row] of block.children.entries()) {
				const tableRow = $createTableRowNode();
				for (const [columnIndex, cell] of row.children.entries()) {
					const tableCell = $createTableCellNode(
						rowIndex === 0
							? TableCellHeaderStates.ROW
							: TableCellHeaderStates.NO_STATUS,
					);
					importMarkdown(
						toMarkdown(
							{
								type: "root",
								children: [{ type: "paragraph", children: cell.children }],
							},
							markdownOptions,
						),
						tableCell,
					);
					const align = block.align?.[columnIndex];
					const paragraph = tableCell.getFirstChild();
					if (align && $isElementNode(paragraph)) paragraph.setFormat(align);
					tableRow.append(tableCell);
				}
				table.append(tableRow);
			}
			container.append(table);
			continue;
		}
		if (
			block.type === "paragraph" &&
			block.children.length === 1 &&
			block.children[0].type === "link" &&
			getXPostId(block.children[0].url) !== null
		) {
			container.append(
				$setState($create(TweetNode), tweetState, block.children[0].url),
			);
			continue;
		}
		let unsupported = false;
		visit(block, (node) => {
			if (
				[
					"html",
					"definition",
					"footnoteDefinition",
					"footnoteReference",
					"linkReference",
					"imageReference",
				].includes(node.type)
			)
				unsupported = true;
		});
		if (unsupported)
			container.append(
				$setState($create(MarkdownSourceNode), sourceState, source),
			);
		else
			container.append(
				...$generateNodesFromMarkdownString(source, markdownTransformers),
			);
	}
	if (container.getChildrenSize() === 0)
		container.append($createParagraphNode());
}
