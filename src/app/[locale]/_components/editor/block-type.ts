import { $createCodeNode } from "@lexical/code-core";
import { $isListNode } from "@lexical/list";
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
	type LexicalNode,
} from "lexical";

/** いちばん内側の引用が段落を持つ引用（読み込んだ引用や、Returnで行を足した引用）なら返す。 */
const $paragraphQuote = (node: LexicalNode) => {
	const quote = $findMatchingParent(node, $isQuoteNode);
	return quote?.isShadowRoot() ? quote : null;
};

/**
 * カーソルのあるブロックの種類。PCのメニューとiPhoneで同じ判定にする。
 * 段落を持つ引用の中の段落は、引用として扱う。
 */
export function $currentBlockType() {
	const selection = $getSelection();
	if (!$isRangeSelection(selection)) return null;
	const anchor = selection.anchor.getNode();
	const block = anchor.getTopLevelElement();
	if ($isParagraphNode(block) && $paragraphQuote(anchor)) return "quote";
	if ($isHeadingNode(block)) return block.getTag();
	if ($isListNode(block)) return block.getListType();
	return block?.getType() ?? null;
}

/**
 * 選んだ種類にする。同じ種類をもう一度選ぶと標準のテキストに戻す。PCのメニューとiPhoneで共有する。
 * 段落を持つ引用の中で引用（段落なら標準のテキストも）を選ぶと、引用の中に引用を作らず引用を解除する。
 */
export function $setBlockType(
	type: "paragraph" | "h2" | "h3" | "h4" | "quote" | "code",
) {
	const selection = $getSelection();
	if (!$isRangeSelection(selection)) return;
	const quote = $paragraphQuote(selection.anchor.getNode());
	if (
		quote &&
		(type === "quote" ||
			(type === "paragraph" && $currentBlockType() === "quote"))
	) {
		for (const child of quote.getChildren()) quote.insertBefore(child);
		quote.remove();
		return;
	}
	const same = $currentBlockType() === type;
	$setBlocksType(selection, () => {
		if (same || type === "paragraph") return $createParagraphNode();
		if (type === "quote") return $createQuoteNode();
		if (type === "code") return $createCodeNode();
		return $createHeadingNode(type);
	});
}
