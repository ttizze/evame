import { $createCodeNode, $isCodeNode } from "@lexical/code-core";
import {
	$insertList,
	$isListItemNode,
	$isListNode,
	$removeList,
} from "@lexical/list";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	$isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $findMatchingParent } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	$isParagraphNode,
	$isRangeSelection,
} from "lexical";

/**
 * カーソルのあるブロックの種類。PCのメニューとiPhoneで同じ判定にする。
 * 段落を持つ引用の中の段落は、引用として扱う。
 */
export function $currentBlockType() {
	const selection = $getSelection();
	if (!$isRangeSelection(selection)) return null;
	const anchor = selection.anchor.getNode();
	const block =
		$findMatchingParent(
			anchor,
			(node) =>
				$isParagraphNode(node) ||
				$isHeadingNode(node) ||
				$isCodeNode(node) ||
				$isListItemNode(node),
		) ?? anchor.getTopLevelElement();
	if ($isParagraphNode(block) && $findMatchingParent(anchor, $isQuoteNode))
		return "quote";
	if ($isHeadingNode(block)) return block.getTag();
	if ($isListItemNode(block)) {
		const list = block.getParentOrThrow();
		if ($isListNode(list)) return list.getListType();
	}
	return block?.getType() ?? null;
}

/**
 * 選んだ種類にする。同じ種類をもう一度選ぶと標準のテキストに戻す。PCのメニューとiPhoneで共有する。
 * 段落を持つ引用の中で引用（段落なら標準のテキストも）を選ぶと、引用の中に引用を作らず引用を解除する。
 */
export function $setBlockType(
	type:
		| "paragraph"
		| "h2"
		| "h3"
		| "h4"
		| "quote"
		| "code"
		| "bullet"
		| "number"
		| "check",
) {
	const selection = $getSelection();
	if (!$isRangeSelection(selection)) return;
	const current = $currentBlockType();
	if (type === "bullet" || type === "number" || type === "check") {
		if (
			$findMatchingParent(
				selection.anchor.getNode(),
				$isListNode,
			)?.getListType() === type
		)
			$removeList();
		else $insertList(type);
		return;
	}
	const quote = $findMatchingParent(selection.anchor.getNode(), $isQuoteNode);
	if (
		quote &&
		(type === "quote" || (type === "paragraph" && current === "quote"))
	) {
		for (const child of quote.getChildren()) quote.insertBefore(child);
		quote.remove();
		return;
	}
	const same = current === type;
	$setBlocksType(selection, () => {
		if (same || type === "paragraph") return $createParagraphNode();
		if (type === "quote") return $createQuoteNode();
		if (type === "code") return $createCodeNode();
		return $createHeadingNode(type);
	});
}
