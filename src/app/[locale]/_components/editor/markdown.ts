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
import type { Image, ImageReference } from "mdast";
import {
	gfmFootnoteFromMarkdown,
	gfmFootnoteToMarkdown,
} from "mdast-util-gfm-footnote";
import { gfmFootnote } from "micromark-extension-gfm-footnote";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";
import { ImageNode, imageState, TweetNode, tweetState } from "./media-nodes";
import {
	FootnoteDefinitionNode,
	FootnoteReferenceNode,
	footnoteState,
	HtmlNode,
	htmlState,
} from "./syntax-nodes";

/**
 * 本文のMarkdownとLexicalの変換。CommonMark/GFMはLexical公式の`@lexical/mdast`に任せ、
 * 公式にないEvameの画像・X埋め込み・HTML・脚注の対応だけを足す。PCとiPhoneで共有する。
 */
export const MarkdownExtension = defineExtension({
	name: "evame-markdown",
	nodes: [
		ImageNode,
		TweetNode,
		HtmlNode,
		FootnoteReferenceNode,
		FootnoteDefinitionNode,
	],
	dependencies: [
		MdastCommonMarkExtension,
		MdastGfmExtension,
		MdastShadowRootQuoteExtension,
		configExtension(MdastExtension, {
			micromarkExtensions: [gfmFootnote()],
			mdastExtensions: [gfmFootnoteFromMarkdown()],
			toMarkdownExtensions: [gfmFootnoteToMarkdown()],
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
						$setState($create(HtmlNode), htmlState, node.value),
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
						children: context.exportBlocks(node),
					}),
				},
			],
		}),
	],
});
