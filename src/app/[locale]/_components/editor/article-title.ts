import { $getPeerDependency } from "@lexical/extension";
import { MdastCommonMarkExtension, MdastExtension } from "@lexical/mdast";
import {
	$createHeadingNode,
	$isHeadingNode,
	HeadingNode,
} from "@lexical/rich-text";
import { $dfsIterator } from "@lexical/utils";
import {
	$getRoot,
	$getSelection,
	$isElementNode,
	$isLineBreakNode,
	$isParagraphNode,
	$isRangeSelection,
	$isTextNode,
	configExtension,
	defineExtension,
	type LexicalNode,
	RootNode,
} from "lexical";

export function $isArticleTitleNode(node: LexicalNode | null): boolean {
	return (
		Boolean(
			$getPeerDependency<typeof ArticleTitleExtension>("evame-article-title"),
		) &&
		$isHeadingNode(node) &&
		node.is($getRoot().getFirstChild())
	);
}

export function $isArticleTitleSelection() {
	const selection = $getSelection();
	return (
		$isRangeSelection(selection) &&
		selection
			.getNodes()
			.some(
				(node) =>
					$isArticleTitleNode(node) ||
					$isArticleTitleNode(node.getTopLevelElement()),
			)
	);
}

export const ArticleTitleExtension = defineExtension({
	name: "evame-article-title",
	dependencies: [
		MdastCommonMarkExtension,
		configExtension(MdastExtension, {
			exportRules: [
				{
					type: HeadingNode,
					$export: (node, context) =>
						$isArticleTitleNode(node) ? [] : context.next(),
				},
			],
		}),
	],
	register: (editor) =>
		editor.registerNodeTransform(RootNode, (root) => {
			const first = root.getFirstChild();
			const textOnly =
				$isElementNode(first) &&
				[...$dfsIterator(first)].every(
					({ node }) =>
						node.is(first) ||
						$isTextNode(node) ||
						$isLineBreakNode(node) ||
						($isElementNode(node) && node.isInline()),
				);
			if ($isHeadingNode(first) && textOnly) {
				if (first.getTag() !== "h1") first.setTag("h1");
			} else {
				const title = $createHeadingNode("h1");
				if ($isParagraphNode(first) && textOnly) first.replace(title, true);
				else if (first) first.insertBefore(title);
				else root.append(title);
			}
		}),
});
