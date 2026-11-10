import {
	$createQuoteNode,
	$isQuoteNode,
	QuoteNode,
	RichTextExtension,
} from "@lexical/rich-text";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	$isParagraphNode,
	$isRangeSelection,
	$setSelection,
	COMMAND_PRIORITY_LOW,
	defineExtension,
	INSERT_PARAGRAPH_COMMAND,
	type ParagraphNode,
} from "lexical";

/**
 * 引用をブロックを持つ公式のshadow root構造に揃え、編集操作をPCとiPhoneで共有する。
 * 文字のある行では同じ引用の中に次の行を作り、空の行では引用を抜ける（途中なら引用を2つに分ける）。
 */
export const QuoteExtension = defineExtension({
	name: "evame-quote",
	dependencies: [RichTextExtension],
	register: (editor) =>
		mergeRegister(
			editor.registerNodeTransform(QuoteNode, (quote) => {
				if (quote.isShadowRoot() && !quote.isEmpty()) return;
				const selection = $getSelection()?.clone();
				const children = quote.getChildren();
				quote.setIsShadowRoot(true);
				let paragraph: ParagraphNode | null = null;
				for (const child of children) {
					if (!child.isInline()) {
						paragraph = null;
						continue;
					}
					if (!paragraph) {
						paragraph = $createParagraphNode();
						child.insertBefore(paragraph);
					}
					paragraph.append(child);
				}
				if (quote.isEmpty()) quote.append($createParagraphNode());
				// 子の移動による選択の自動補正で文字内の位置を失わないよう、元の位置を戻す。
				if ($isRangeSelection(selection)) {
					for (const point of [selection.anchor, selection.focus]) {
						if (point.key !== quote.getKey()) continue;
						const child = children[point.offset] ?? children.at(-1);
						if (!child)
							point.set(quote.getFirstChildOrThrow().getKey(), 0, "element");
						else {
							const parent = child.isInline()
								? child.getParentOrThrow()
								: quote;
							point.set(
								parent.getKey(),
								child.getIndexWithinParent() +
									(point.offset === children.length ? 1 : 0),
								"element",
							);
						}
					}
					$setSelection(selection);
				}
			}),
			editor.registerCommand(
				INSERT_PARAGRAPH_COMMAND,
				() => {
					const selection = $getSelection();
					if (!$isRangeSelection(selection)) return false;
					const quote = $findMatchingParent(
						selection.anchor.getNode(),
						$isQuoteNode,
					);
					// 選択の両端が同じ引用の中にあるときだけ扱う。
					if (
						!quote?.is(
							$findMatchingParent(selection.focus.getNode(), $isQuoteNode),
						)
					)
						return false;
					if (!selection.isCollapsed()) return false;
					const block = $findMatchingParent(
						selection.anchor.getNode(),
						(node) => quote.is(node.getParent()),
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
		),
});
