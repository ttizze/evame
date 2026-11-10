import { $isCodeNode } from "@lexical/code-core";
import { $isListItemNode, $isListNode } from "@lexical/list";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $findMatchingParent } from "@lexical/utils";
import {
	$getEditor,
	$getSelection,
	$isParagraphNode,
	$isRangeSelection,
} from "lexical";
import { listCommands, SET_TEXT_BLOCK_COMMAND } from "./block-editing";

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
 * 選んだ種類にする。リスト以外は同じ種類を再選択すると標準のテキストに戻す。PCとiPhoneで共有する。
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
		const entry = listCommands.find((entry) => entry.type === type);
		if (entry) $getEditor().dispatchCommand(entry.command, undefined);
		return;
	}
	if (type === "paragraph" || (type === "quote" && current === "quote")) {
		const quotes = new Set(
			selection
				.getNodes()
				.map((node) => $findMatchingParent(node, $isQuoteNode))
				.filter($isQuoteNode),
		);
		for (const quote of quotes) {
			for (const child of quote.getChildren()) quote.insertBefore(child);
			quote.remove();
		}
	}
	$getEditor().dispatchCommand(
		SET_TEXT_BLOCK_COMMAND,
		current === type ? "paragraph" : type,
	);
}
