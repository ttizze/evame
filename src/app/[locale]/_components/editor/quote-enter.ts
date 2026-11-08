import {
	$createQuoteNode,
	$isQuoteNode,
	type QuoteNode,
} from "@lexical/rich-text";
import { $findMatchingParent } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	$isParagraphNode,
	$isRangeSelection,
	COMMAND_PRIORITY_LOW,
	defineExtension,
	INSERT_PARAGRAPH_COMMAND,
} from "lexical";

/**
 * 引用の中のReturnをリストと同じ動きにする。PCとiPhoneで共有する。
 * 文字のある行では同じ引用の中に次の行を作り、空の行では引用を抜ける（途中なら引用を2つに分ける）。
 */
export const QuoteEnterExtension = defineExtension({
	name: "evame-quote-enter",
	register: (editor) =>
		editor.registerCommand(
			INSERT_PARAGRAPH_COMMAND,
			() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection) || !selection.isCollapsed())
					return false;
				const quote = $findMatchingParent(
					selection.anchor.getNode(),
					$isQuoteNode,
				) as QuoteNode | null;
				if (!quote) return false;
				if (!quote.isShadowRoot()) {
					if (quote.isEmpty()) {
						const paragraph = $createParagraphNode();
						quote.replace(paragraph);
						paragraph.select();
						return true;
					}
					// メニューや「> 」で作った引用は文字を直接持つため、段落を持つ引用へ変えてから標準の分割に任せる。
					const paragraph = $createParagraphNode().append(
						...quote.getChildren(),
					);
					quote.append(paragraph).setIsShadowRoot(true);
					return false;
				}
				const block = $findMatchingParent(selection.anchor.getNode(), (node) =>
					quote.is(node.getParent()),
				);
				if (!$isParagraphNode(block) || !block.isEmpty()) return false;
				const rest = block.getNextSiblings();
				quote.insertAfter(block);
				if (rest.length > 0)
					block.insertAfter(
						$createQuoteNode({ shadowRoot: true }).append(...rest),
					);
				if (quote.isEmpty()) quote.remove();
				block.select();
				return true;
			},
			COMMAND_PRIORITY_LOW,
		),
});
