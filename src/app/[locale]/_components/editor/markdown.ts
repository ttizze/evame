import { ListNode } from "@lexical/list";
import {
	type FootnoteDefinition,
	type FootnoteReference,
	type Html,
	MdastCommonMarkExtension,
	MdastExtension,
	MdastGfmExtension,
	MdastShadowRootQuoteExtension,
	type Paragraph,
} from "@lexical/mdast";
import {
	$create,
	$getState,
	$setState,
	configExtension,
	defineExtension,
} from "lexical";
import type { Definition, Image, ImageReference } from "mdast";
import {
	gfmFootnoteFromMarkdown,
	gfmFootnoteToMarkdown,
} from "mdast-util-gfm-footnote";
import { gfmFootnote } from "micromark-extension-gfm-footnote";
import { visit } from "unist-util-visit";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";
import { ImageNode, imageState, TweetNode, tweetState } from "./media-nodes";
import { QuoteExtension } from "./quote";
import {
	DefinitionNode,
	definitionState,
	FootnoteDefinitionNode,
	FootnoteReferenceNode,
	footnoteState,
	HtmlBlockNode,
	HtmlNode,
	htmlState,
	MarkdownListNode,
} from "./syntax-nodes";

declare module "mdast" {
	interface HtmlData {
		/** 段落の外に書かれたHTMLかどうか。MDASTの型だけでは文中のHTMLと区別できない。 */
		block?: boolean;
	}
}

/**
 * 本文のMarkdownとLexicalの変換。CommonMark/GFMはLexical公式の`@lexical/mdast`に任せ、
 * Evameの画像・X埋め込み・HTML・脚注・参照定義と空チェック項目の保持規則を足す。PCとiPhoneで共有する。
 */
export const MarkdownExtension = defineExtension({
	name: "evame-markdown",
	nodes: [
		MarkdownListNode,
		{
			replace: ListNode,
			with: (node: ListNode) =>
				new MarkdownListNode(node.getListType(), node.getStart()),
			withKlass: MarkdownListNode,
		},
		ImageNode,
		TweetNode,
		HtmlNode,
		HtmlBlockNode,
		FootnoteReferenceNode,
		FootnoteDefinitionNode,
		DefinitionNode,
	],
	dependencies: [
		QuoteExtension,
		MdastCommonMarkExtension,
		MdastGfmExtension,
		MdastShadowRootQuoteExtension,
		configExtension(MdastExtension, {
			micromarkExtensions: [gfmFootnote()],
			mdastExtensions: [
				gfmFootnoteFromMarkdown(),
				{
					transforms: [
						(tree) =>
							visit(tree, "html", (node, _index, parent) => {
								if (
									parent &&
									[
										"root",
										"blockquote",
										"listItem",
										"footnoteDefinition",
									].includes(parent.type)
								)
									node.data = { ...node.data, block: true };
							}),
						(tree) =>
							visit(tree, "listItem", (node) => {
								// GFMでは記号の後に文字がないとチェック項目にならないため、
								// 空のチェック項目は空白1文字の段落で書き出す。読み込みでは空の項目へ戻す。
								const [paragraph] = node.children;
								if (
									node.checked != null &&
									paragraph.type === "paragraph" &&
									paragraph.children.length === 1 &&
									paragraph.children[0].type === "text" &&
									paragraph.children[0].value === " "
								)
									paragraph.children = [];
							}),
					],
				},
			],
			toMarkdownExtensions: [gfmFootnoteToMarkdown()],
			// 公式の行内ショートカットにない画像も、記法を閉じた時点で画像にする。
			inlineShortcutTypes: ["image"],
			importRules: [
				{
					type: "image",
					$import: (node: Image) =>
						$setState($create(ImageNode), imageState, {
							src: node.url,
							alt: node.alt ?? "",
							title: node.title ?? null,
						}),
				},
				{
					type: "imageReference",
					$import: (node: ImageReference, context) => {
						const definition = context.getDefinition(node.identifier);
						return definition
							? $setState($create(ImageNode), imageState, {
									src: definition.url,
									alt: node.alt ?? "",
									title: definition.title ?? null,
								})
							: context.next();
					},
				},
				{
					// 表示側と同じく、Xの投稿URLだけの段落を埋め込みとして扱う。
					type: "paragraph",
					$import: (node: Paragraph, context) => {
						const [link] = node.children;
						return node.children.length === 1 &&
							link?.type === "link" &&
							getXPostId(link.url) !== null
							? $setState($create(TweetNode), tweetState, link.url)
							: context.next();
					},
				},
				{
					type: "html",
					$import: (node: Html) =>
						$setState(
							$create(node.data?.block ? HtmlBlockNode : HtmlNode),
							htmlState,
							node.value,
						),
				},
				{
					type: "definition",
					$import: (node: Definition) =>
						$setState($create(DefinitionNode), definitionState, {
							identifier: node.identifier,
							label: node.label ?? null,
							url: node.url,
							title: node.title ?? null,
						}),
				},
				{
					type: "footnoteReference",
					$import: (node: FootnoteReference) =>
						$setState($create(FootnoteReferenceNode), footnoteState, {
							identifier: node.identifier,
							label: node.label ?? null,
						}),
				},
				{
					type: "footnoteDefinition",
					$import: (node: FootnoteDefinition, context) =>
						$setState($create(FootnoteDefinitionNode), footnoteState, {
							identifier: node.identifier,
							label: node.label ?? null,
						}).append(...context.importChildren(node)),
				},
			],
			exportRules: [
				{
					type: ListNode,
					$export: (_node: ListNode, context) => {
						const output = context.next();
						for (const list of output)
							visit(list, "listItem", (item) => {
								if (item.checked == null) return;
								const first = item.children[0];
								if (first?.type === "paragraph") {
									if (first.children.length === 0)
										first.children = [{ type: "text", value: " " }];
								} else
									item.children.unshift({
										type: "paragraph",
										children: [{ type: "text", value: " " }],
									});
							});
						return output;
					},
				},
				{
					type: ImageNode,
					$export: (node: ImageNode) => {
						const { src, alt, title } = $getState(node, imageState);
						return { type: "image", url: src, alt, title };
					},
				},
				{
					type: TweetNode,
					$export: (node: TweetNode) => {
						const url = $getState(node, tweetState);
						return {
							type: "paragraph",
							children: [
								{ type: "link", url, children: [{ type: "text", value: url }] },
							],
						};
					},
				},
				{
					type: HtmlNode,
					$export: (node: HtmlNode) => ({
						type: "html",
						value: $getState(node, htmlState),
					}),
				},
				{
					type: DefinitionNode,
					$export: (node: DefinitionNode) => ({
						type: "definition",
						...$getState(node, definitionState),
					}),
				},
				{
					type: FootnoteReferenceNode,
					$export: (node: FootnoteReferenceNode) => ({
						type: "footnoteReference",
						...$getState(node, footnoteState),
					}),
				},
				{
					type: FootnoteDefinitionNode,
					$export: (node: FootnoteDefinitionNode, context) => ({
						type: "footnoteDefinition",
						...$getState(node, footnoteState),
						children: context.exportChildren(
							node,
						) as FootnoteDefinition["children"],
					}),
				},
			],
		}),
	],
});
