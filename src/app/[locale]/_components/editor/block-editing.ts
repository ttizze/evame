import { $createCodeNode } from "@lexical/code-core";
import { TabIndentationExtension } from "@lexical/extension";
import {
	$createListItemNode,
	$createListNode,
	$handleListInsertParagraph,
	$insertList,
	$isListItemNode,
	$isListNode,
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListExtension,
	type ListItemNode,
	type ListNode,
	type ListType,
} from "@lexical/list";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { paragraphBreakState } from "@lexical/mdast";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import {
	$copyBlockFormatIndent,
	$isAtEdgeOfElement,
	$setBlocksType,
} from "@lexical/selection";
import { $findMatchingParent, $handleIndentAndOutdent } from "@lexical/utils";
import {
	$addUpdateTag,
	$copyNode,
	$createParagraphNode,
	$getNodeByKey,
	$getRoot,
	$getSelection,
	$getSiblingCaret,
	$getState,
	$isElementNode,
	$isLineBreakNode,
	$isParagraphNode,
	$isRangeSelection,
	$isRootOrShadowRoot,
	$isTextNode,
	$setPointFromCaret,
	$setSelection,
	COMMAND_PRIORITY_CRITICAL,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	configExtension,
	createCommand,
	defineExtension,
	HISTORY_PUSH_TAG,
	INDENT_CONTENT_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	KEY_SPACE_COMMAND,
	KEY_TAB_COMMAND,
	type LexicalNode,
	mergeRegister,
	OUTDENT_CONTENT_COMMAND,
	ParagraphNode,
	type PointType,
	SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from "lexical";

/** 本文全体の貼り付けと、コード内への部分貼り付けの境界を揃える。 */
export function $isEntireDocumentSelection(
	collapsed: boolean,
	anchor: PointType,
	focus: PointType,
) {
	if (collapsed) return false;
	const root = $getRoot();
	const backward = focus.isBefore(anchor);
	return (
		$isAtEdgeOfElement(backward ? focus : anchor, root, "previous") &&
		$isAtEdgeOfElement(backward ? anchor : focus, root, "next")
	);
}

export const SET_TEXT_BLOCK_COMMAND = createCommand<
	"paragraph" | "h2" | "h3" | "h4" | "quote" | "code"
>("SET_TEXT_BLOCK_COMMAND");

export const listCommands = [
	{ type: "number", command: INSERT_ORDERED_LIST_COMMAND },
	{ type: "bullet", command: INSERT_UNORDERED_LIST_COMMAND },
	{ type: "check", command: INSERT_CHECK_LIST_COMMAND },
] as const;

function $hasBodyBlocks(children: readonly LexicalNode[]) {
	return children.some(
		(node) =>
			!node.isInline() ||
			($isLineBreakNode(node) && $getState(node, paragraphBreakState)),
	);
}

/** メニュー変換と標準Backspaceの両方が作る段落から、子ブロックと段落境界を戻す。 */
function $splitParagraphBlocks(paragraph: ParagraphNode) {
	if (!$hasBodyBlocks(paragraph.getChildren())) return;
	let after: LexicalNode = paragraph;
	let inline: ParagraphNode | null = paragraph;
	for (const child of paragraph.getChildren()) {
		if ($isLineBreakNode(child) && $getState(child, paragraphBreakState)) {
			child.remove();
			inline = null;
		} else if (!child.isInline()) {
			after.insertAfter(child);
			after = child;
			inline = null;
		} else {
			if (!inline) {
				inline = $createParagraphNode();
				$copyBlockFormatIndent(paragraph, inline);
				after.insertAfter(inline);
				after = inline;
			}
			if (!inline.is(child.getParent())) inline.append(child);
		}
	}
	if (paragraph.isEmpty()) paragraph.remove();
}

/** 子リストだけを持つ専用容器。前後に本文を持つ項目とは区別する。 */
export function $isListContainer(
	node: LexicalNode | null,
): node is ListItemNode {
	return (
		$isListItemNode(node) &&
		node.getChildrenSize() === 1 &&
		$isListNode(node.getFirstChild())
	);
}

/** Lexicalでは子リストを直後の専用項目に保持する。親と一緒に扱う範囲をここで揃える。 */
function $itemGroup(item: ListItemNode): LexicalNode[] {
	const group: LexicalNode[] = [item];
	let next = item.getNextSibling();
	while ($isListContainer(next)) {
		group.push(next);
		next = next.getNextSibling();
	}
	return group;
}

/** 子リストの容器を飛ばし、直前の実項目を親解決とTabの移動先で揃える。 */
function $skipListContainers(node: LexicalNode | null) {
	while ($isListContainer(node)) node = node.getPreviousSibling();
	return $isListItemNode(node) ? node : null;
}

/** 種類の異なる子リストが並んでいても、容器を飛ばして同じ親項目を返す。 */
export function $getParentListItem(item: ListItemNode): ListItemNode | null {
	const wrapper = item.getParent()?.getParent();
	return $isListItemNode(wrapper)
		? $isListContainer(wrapper)
			? $skipListContainers(wrapper.getPreviousSibling())
			: wrapper
		: null;
}

function $insertListAfter(list: ListNode, next: ListNode) {
	const parent = list.getParentOrThrow();
	if ($isListContainer(parent))
		parent.insertAfter($createListItemNode().append(next));
	else list.insertAfter(next);
}

function $removeEmptyList(list: ListNode) {
	if (!list.isEmpty()) return;
	const parent = list.getParent();
	if ($isListContainer(parent)) parent.remove();
	else list.remove();
}

/** 項目とその子を取り出しても、後続の番号と残ったリストの深さを保つ。 */
function $isolateItem(item: ListItemNode): ListNode {
	const list = item.getParentOrThrow();
	if (!$isListNode(list)) throw new Error("List item has no list");
	const group = $itemGroup(item);
	const following = group[group.length - 1].getNextSiblings();
	if (following.length) {
		const after = $copyNode(list);
		const first = following[0];
		if ($isListItemNode(first)) after.setStart(first.getValue());
		after.append(...following);
		$insertListAfter(list, after);
	}
	const isolated = $copyNode(list).setStart(item.getValue());
	$insertListAfter(list, isolated);
	isolated.append(...group);
	$removeEmptyList(list);
	return isolated;
}

/** 次の行の先頭までの選択は、その行の文字を含まない範囲へ揃える。 */
function $normalizeListSelection() {
	const selection = $getSelection();
	if ($isRangeSelection(selection) && !selection.isCollapsed()) {
		const end = selection.isBackward() ? selection.anchor : selection.focus;
		if (end.offset === 0) {
			let node: LexicalNode = end.getNode();
			let previous = node.getPreviousSibling();
			while (!previous) {
				const parent = node.getParent();
				if (!parent) break;
				node = parent;
				previous = node.getPreviousSibling();
			}
			if (previous) {
				const last = $isElementNode(previous)
					? (previous.getLastDescendant() ?? previous)
					: previous;
				$setPointFromCaret(end, $getSiblingCaret(last, "next"));
			}
		}
	}
	const items = new Set<ListItemNode>();
	let hasOtherBlocks = false;
	for (const node of $isRangeSelection(selection) ? selection.getNodes() : []) {
		let parent: LexicalNode | null = node;
		while (parent && !$isListItemNode(parent)) parent = parent.getParent();
		if (!parent && !$isListNode(node) && !$isRootOrShadowRoot(node))
			hasOtherBlocks = true;
		if ($isListItemNode(parent) && !$isListContainer(parent)) items.add(parent);
	}
	return { items: [...items], hasOtherBlocks };
}

function $changeItemType(item: ListItemNode, type: ListType) {
	const list = item.getParentOrThrow();
	if ($isListNode(list) && list.getListType() !== type) {
		return $isolateItem(item).setListType(type).setStart(1);
	}
	return null;
}

/** ドラッグとTabの共通の移動。キーから現在のノードを解決し、子項目も同時に移す。 */
export function $moveEditorBlock(
	sourceKey: string,
	targetKey: string,
	placement: "before" | "after" | "inside",
) {
	const source = $getNodeByKey(sourceKey);
	const target = $getNodeByKey(targetKey);
	if (!source || !target || source.is(target)) return;
	const group = $isListItemNode(source) ? $itemGroup(source) : [source];
	if (
		group.some(
			(node) =>
				node.is(target) || ($isElementNode(node) && node.isParentOf(target)),
		)
	)
		return;
	const sourceList = $isListItemNode(source) ? source.getParent() : null;
	const list = $isListNode(sourceList)
		? $copyNode(sourceList).setStart(1)
		: null;
	if ($isListItemNode(target)) {
		const targetList = target.getParentOrThrow();
		if (!$isListNode(targetList)) return;
		if (!list && placement !== "inside") {
			const isolated = $isolateItem(target);
			if (placement === "before") isolated.insertBefore(source);
			else isolated.insertAfter(source);
			$addUpdateTag(HISTORY_PUSH_TAG);
			return;
		}
		const moving = list ?? $createListNode(targetList.getListType());
		if (list) moving.append(...group);
		else {
			const item = $createListItemNode();
			if ($isParagraphNode(source)) {
				item.append(...source.getChildren());
				source.remove();
			} else item.append(source);
			moving.append(item);
		}
		if (placement === "inside") {
			const children = $itemGroup(target).slice(1);
			const last = children.at(-1);
			const nested = $isListItemNode(last) ? last.getFirstChild() : null;
			if ($isListNode(nested) && nested.getListType() === moving.getListType())
				nested.append(...moving.getChildren());
			else (last ?? target).insertAfter($createListItemNode().append(moving));
		} else if (moving.getListType() === targetList.getListType()) {
			const targetGroup = $itemGroup(target);
			const at =
				placement === "before" ? target : targetGroup[targetGroup.length - 1];
			targetList.splice(
				at.getIndexWithinParent() + (placement === "after" ? 1 : 0),
				0,
				moving.getChildren(),
			);
		} else {
			const isolatedTarget = $isolateItem(target);
			if (placement === "after") $insertListAfter(isolatedTarget, moving);
			else {
				const parent = isolatedTarget.getParentOrThrow();
				if ($isListContainer(parent))
					parent.insertBefore($createListItemNode().append(moving));
				else isolatedTarget.insertBefore(moving);
			}
		}
	} else {
		const moving = list ? list.append(...group) : source;
		if (placement === "before") target.insertBefore(moving);
		else target.insertAfter(moving);
	}
	if ($isListNode(sourceList)) $removeEmptyList(sourceList);
	$addUpdateTag(HISTORY_PUSH_TAG);
}

export const BlockEditingExtension = defineExtension({
	name: "evame-block-editing",
	dependencies: [
		configExtension(ListExtension, { shouldPreserveNumbering: true }),
	],
	register: (editor) =>
		mergeRegister(
			editor.registerCommand(
				SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
				({ nodes, selection }) => {
					// 標準インポーターで有効なノードを復元してから、全文置換の挿入位置を準備する。
					if (
						nodes.length &&
						$isRangeSelection(selection) &&
						$isEntireDocumentSelection(
							selection.isCollapsed(),
							selection.anchor,
							selection.focus,
						)
					) {
						const root = $getRoot().clear();
						selection.anchor.set(root.getKey(), 0, "element");
						selection.focus.set(root.getKey(), 0, "element");
						$setSelection(selection);
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerNodeTransform(ParagraphNode, $splitParagraphBlocks),
			editor.registerCommand(
				SET_TEXT_BLOCK_COMMAND,
				(value) => {
					$normalizeListSelection();
					const selection = $getSelection();
					if (!$isRangeSelection(selection)) return false;
					const bodies = new Set(
						selection
							.getNodes()
							.map((node) =>
								$findMatchingParent(
									node,
									(node) => $isElementNode(node) && !node.isInline(),
								),
							)
							.filter($isListItemNode),
					);
					// 標準のブロック変換へ渡す前に、親本文と選択外の子リストを別のブロックへ戻す。
					for (const item of [...bodies].reverse()) {
						if (!$hasBodyBlocks(item.getChildren())) continue;
						$isolateItem(item);
						const paragraph = $createParagraphNode();
						$copyBlockFormatIndent(item, paragraph);
						item.replace(paragraph, true);
						$splitParagraphBlocks(paragraph);
					}
					const { items } = $normalizeListSelection();
					// 標準の変換は最上位まで戻すため、祖先で分かれる後続の番号も先に守る。
					const toIsolate = new Set(items);
					for (const item of toIsolate) {
						const owner = $getParentListItem(item);
						if (owner) toIsolate.add(owner);
						$isolateItem(item);
					}
					$setBlocksType(selection, () => {
						if (value === "paragraph") return $createParagraphNode();
						if (value === "quote") return $createQuoteNode();
						if (value === "code") return $createCodeNode();
						return $createHeadingNode(value);
					});
					$addUpdateTag(HISTORY_PUSH_TAG);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			...listCommands.map(({ command, type }) =>
				editor.registerCommand(
					command,
					() => {
						const { items, hasOtherBlocks } = $normalizeListSelection();
						if (!items.length) return false;
						if (
							!hasOtherBlocks &&
							items.every((item) => {
								const list = item.getParent();
								return $isListNode(list) && list.getListType() === type;
							})
						)
							return true;
						// 選択項目を先に分け、混在する通常段落を含む変換は標準APIに任せる。
						for (const item of items) {
							const list = $isolateItem(item);
							if (list.getListType() !== type) list.setStart(1);
						}
						$insertList(type);
						$addUpdateTag(HISTORY_PUSH_TAG);
						return true;
					},
					COMMAND_PRIORITY_HIGH,
				),
			),
			...([INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND] as const).map(
				(command) =>
					editor.registerCommand(
						command,
						() => {
							const selected = $normalizeListSelection();
							if (!selected.items.length) return false;
							if (selected.hasOtherBlocks)
								$handleIndentAndOutdent((block) => {
									if (!$findMatchingParent(block, $isListItemNode))
										block.setIndent(
											Math.max(
												0,
												block.getIndent() +
													(command === INDENT_CONTENT_COMMAND ? 1 : -1),
											),
										);
								});
							const selectedItems = new Set(selected.items);
							// 移動のときだけ親と一緒に動く子を除き、二重の階層変更を防ぐ。
							const items = selected.items.filter((item) => {
								let parent = $getParentListItem(item);
								while (parent) {
									if (selectedItems.has(parent)) return false;
									parent = $getParentListItem(parent);
								}
								return true;
							});
							for (const item of command === OUTDENT_CONTENT_COMMAND
								? items.toReversed()
								: items) {
								if (command === INDENT_CONTENT_COMMAND) {
									let previous = $skipListContainers(item.getPreviousSibling());
									if (!previous) {
										const list = item.getParentOrThrow();
										const parent = list.getParentOrThrow();
										const sibling = $isListContainer(parent)
											? parent.getPreviousSibling()
											: list.getPreviousSibling();
										const previousList = $isListContainer(sibling)
											? sibling.getFirstChild()
											: sibling;
										if ($isListNode(previousList))
											previous = $skipListContainers(
												previousList.getLastChild(),
											);
									}
									if (previous)
										$moveEditorBlock(
											item.getKey(),
											previous.getKey(),
											"inside",
										);
								} else {
									const owner = $getParentListItem(item);
									if (owner)
										$moveEditorBlock(item.getKey(), owner.getKey(), "after");
								}
							}
							return true;
						},
						COMMAND_PRIORITY_CRITICAL,
					),
			),
			editor.registerCommand(
				INSERT_PARAGRAPH_COMMAND,
				() => {
					const selection = $getSelection();
					if (!$isRangeSelection(selection) || !selection.isCollapsed())
						return false;
					const [item] = $normalizeListSelection().items;
					const list = item?.getParent();
					if (
						!item ||
						!$isListNode(list) ||
						!item
							.getChildren()
							.every(
								(node) =>
									$isTextNode(node) && node.getTextContent().trim() === "",
							)
					)
						return false;
					const type = list.getListType();
					$isolateItem(item);
					if (!$handleListInsertParagraph(true)) return false;
					for (const next of $normalizeListSelection().items)
						$changeItemType(next, type);
					$addUpdateTag(HISTORY_PUSH_TAG);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				KEY_SPACE_COMMAND,
				(event) => {
					if (editor.isComposing()) return false;
					const selection = $getSelection();
					if (!$isRangeSelection(selection) || !selection.isCollapsed())
						return false;
					const node = selection.anchor.getNode();
					if (!$isTextNode(node) || node.hasFormat("code")) return false;
					const parent = node.getParent();
					if (
						(!$isListItemNode(parent) && !$isParagraphNode(parent)) ||
						parent.getFirstChild() !== node
					)
						return false;
					const marker = node
						.getTextContent()
						.slice(0, selection.anchor.offset);
					if (marker.trimStart() !== marker) return false;
					const input = `${marker} `;
					const check = CHECK_LIST.regExp.exec(input);
					const ordered = ORDERED_LIST.regExp.exec(input);
					const bullet = UNORDERED_LIST.regExp.exec(input);
					const type =
						check?.[0] === input
							? "check"
							: ordered?.[0] === input && ordered[2].length <= 9
								? "number"
								: bullet?.[0] === input
									? "bullet"
									: null;
					if (!type || (!$isListItemNode(parent) && marker !== "[]"))
						return false;
					const item = $isListItemNode(parent)
						? parent
						: $createListItemNode().append(...parent.getChildren());
					const list = $isListItemNode(parent)
						? $changeItemType(item, type)
						: $createListNode(type).append(item);
					// 同じ種類なら記法ではなく本文の入力として扱い、打った文字を残す。
					if (!list) return false;
					event.preventDefault();
					node.setTextContent(
						node.getTextContent().slice(selection.anchor.offset),
					);
					if (!$isListItemNode(parent)) parent.replace(list);
					if (ordered) list.setStart(Number(ordered[2]));
					if (type === "check")
						item.setChecked(check?.[3]?.toLowerCase() === "x");
					item.selectStart();
					$addUpdateTag(HISTORY_PUSH_TAG);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		),
});

/** 記事の本文だけで使い、コメント欄ではTabキーのフォーカス移動を妨げない。 */
export const TabEditingExtension = defineExtension({
	name: "evame-tab-editing",
	dependencies: [BlockEditingExtension, TabIndentationExtension],
	register: (editor) =>
		editor.registerCommand(
			KEY_TAB_COMMAND,
			(event) => {
				const { items } = $normalizeListSelection();
				if (!items.length) return false;
				event.preventDefault();
				return editor.dispatchCommand(
					event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
					undefined,
				);
			},
			COMMAND_PRIORITY_LOW,
		),
});
