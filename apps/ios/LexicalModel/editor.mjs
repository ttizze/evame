// iPhoneの編集画面が使う文書モデル。PCと同じMarkdown変換（MarkdownExtension）を、DOMのないJavaScriptCoreで動かす。
// 画面とは、表示単位（段落・項目などの文字の並び、または表・区切り線などの1文字の塊）と、その中の位置だけでやり取りする。
import {
	$getLexicalContent,
	$insertDataTransferForRichText,
} from "@lexical/clipboard";
import {
	buildEditorFromExtensions,
	getExtensionDependencyFromEditor,
} from "@lexical/extension";
import { HeadlessExtension } from "@lexical/headless";
import { HistoryExtension } from "@lexical/history";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isListItemNode, $isListNode } from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	$generateNodesFromMarkdownString,
	paragraphBreakState,
} from "@lexical/mdast";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $isTableNode, INSERT_TABLE_COMMAND } from "@lexical/table";
import {
	AbortController,
	AbortSignal,
} from "abort-controller/dist/abort-controller.mjs";
import {
	$create,
	$createParagraphNode,
	$createRangeSelection,
	$createTabNode,
	$getRoot,
	$getSelection,
	$getState,
	$isDecoratorNode,
	$isElementNode,
	$isLineBreakNode,
	$isNodeSelection,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	$setState,
	CLEAR_HISTORY_COMMAND,
	configExtension,
	DELETE_CHARACTER_COMMAND,
	defineExtension,
	FORMAT_TEXT_COMMAND,
	INDENT_CONTENT_COMMAND,
	KEY_ENTER_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	REDO_COMMAND,
	tokenizeRawText,
	UNDO_COMMAND,
} from "lexical";
import {
	$currentBlockType,
	$setBlockType,
} from "../../../src/app/[locale]/_components/editor/block-type";
import { DocumentExtension } from "../../../src/app/[locale]/_components/editor/document";
import {
	ImageNode,
	imageState,
	tweetState,
} from "../../../src/app/[locale]/_components/editor/media-nodes";
import {
	definitionState,
	FootnoteDefinitionNode,
	footnoteState,
	htmlState,
} from "../../../src/app/[locale]/_components/editor/syntax-nodes";

// JavaScriptCoreにはないため、Lexicalの拡張が後始末に使うAbortControllerを補う。
globalThis.AbortController = AbortController;
globalThis.AbortSignal = AbortSignal;
// JavaScriptCoreにはタイマーもない。Lexicalは連鎖した更新の回数を次のイベントで数え直すため、
// 次の利用者の操作（要求）の始めに実行する。
const timers = [];
globalThis.setTimeout = (callback) => timers.push(callback);
// 更新中の例外をLexicalへ投げ返すと、途中まで変えた状態を確定済みの状態へ戻す後始末が飛ばされる。
// 記録だけしてLexicalに戻させ、戻した後の文書と合わせて呼び出し元へ返す。
// 入力の後に積まれる記法変換などの更新が失敗しても、確定済みの入力を画面と揃える。
let failure = null;

const editor = buildEditorFromExtensions(
	defineExtension({
		name: "evame-ios-editor",
		onError: (error) => {
			failure ??= error;
		},
		dependencies: [
			HeadlessExtension,
			// ブラウザーのない環境では履歴が既定で無効になるため、明示して有効にする。
			configExtension(HistoryExtension, { disabled: false }),
			DocumentExtension,
		],
	}),
);
// Lexicalはブロック先頭のBackspaceでブラウザーの選択を測ろうとし、windowがないと例外を投げる。
// DOMのない環境では選択の取得がwindowを参照せずnullを返すため、空のwindowを渡してモデルの処理へ進める。
// https://github.com/meta/lexical/issues/9849
editor._window = {};

const isAtomic = (node) =>
	($isDecoratorNode(node) && !node.isInline()) || $isTableNode(node);
/** 文書から表示単位を読む。本文ノードとリスト記号の所有者を分け、項目内の全段落を順番どおりに渡す。 */
function units() {
	const result = [];
	function visit(container, context) {
		const first = result.length;
		let children = [];
		let start = 0;
		const flush = (end, force = false) => {
			if (children.length > 0 || force) {
				result.push({
					node: container,
					children,
					start,
					end,
					atomic: false,
					context,
					listItems: [],
				});
				children = [];
			}
		};
		for (const [index, node] of container.getChildren().entries()) {
			if (
				$isListItemNode(container) &&
				$isLineBreakNode(node) &&
				$getState(node, paragraphBreakState)
			) {
				flush(
					index,
					index === 0 || node.getPreviousSibling()?.isInline() === true,
				);
				start = index + 1;
				continue;
			}
			if (node.isInline()) {
				children.push(node);
				continue;
			}
			flush(index);
			start = index + 1;
			if (isAtomic(node))
				result.push({ node, atomic: true, context, listItems: [] });
			else if (!$isElementNode(node)) continue;
			else if ($isListNode(node))
				visit(node, {
					...context,
					lists: [...context.lists, { kind: node.getListType() }],
				});
			else if ($isQuoteNode(node))
				visit(node, { ...context, quote: context.quote + 1 });
			else if (node instanceof FootnoteDefinitionNode) {
				const { identifier, label } = $getState(node, footnoteState);
				visit(node, { ...context, footnote: label ?? identifier });
			} else visit(node, context);
		}
		const last = container.getLastChild();
		flush(
			container.getChildrenSize(),
			container.isEmpty() ||
				($isListItemNode(container) &&
					$isLineBreakNode(last) &&
					$getState(last, paragraphBreakState)),
		);
		if (
			$isListItemNode(container) &&
			!(
				container.getChildrenSize() === 1 &&
				$isListNode(container.getFirstChild())
			) &&
			result[first]
		)
			result[first].listItems.unshift({
				node: container,
				depth: context.lists.length,
				quote: context.quote,
				footnote: context.footnote !== null,
			});
	}
	visit($getRoot(), { lists: [], quote: 0, footnote: null });
	return result;
}

/** 表示単位の中の葉。文字はUTF16の長さ、改行・行内の装飾ノードは1文字として数える。 */
function leaves(children, link = null, result = []) {
	for (const child of children) {
		if ($isTextNode(child))
			result.push({ node: child, size: child.getTextContentSize(), link });
		else if ($isElementNode(child))
			leaves(
				child.getChildren(),
				$isLinkNode(child) ? child.getURL() : link,
				result,
			);
		else result.push({ node: child, size: 1, link });
	}
	return result;
}

function pointAt(position) {
	const unit = units()[position.unit];
	if (!unit) throw new Error("invalid position");
	const { node } = unit;
	if (unit.atomic) {
		if (position.offset < 0 || position.offset > 1)
			throw new Error("invalid position");
		return {
			key: node.getParentOrThrow().getKey(),
			offset: node.getIndexWithinParent() + position.offset,
			type: "element",
		};
	}
	let remaining = position.offset;
	if (remaining < 0) throw new Error("invalid position");
	const parts = leaves(unit.children);
	for (const leaf of parts) {
		if ($isTextNode(leaf.node)) {
			if (remaining <= leaf.size)
				return { key: leaf.node.getKey(), offset: remaining, type: "text" };
		} else if (remaining === 0)
			return {
				key: leaf.node.getParentOrThrow().getKey(),
				offset: leaf.node.getIndexWithinParent(),
				type: "element",
			};
		remaining -= leaf.size;
	}
	if (remaining !== 0) throw new Error("invalid position");
	const last = parts.at(-1)?.node;
	return last
		? {
				key: last.getParentOrThrow().getKey(),
				offset: last.getIndexWithinParent() + 1,
				type: "element",
			}
		: { key: node.getKey(), offset: unit.start, type: "element" };
}

/** Lexicalの位置を、それを含む表示単位と単位内の位置へ戻す。 */
function positionOf(point, list) {
	const node = point.getNode();
	for (const [index, unit] of list.entries()) {
		if (unit.atomic) {
			if (unit.node.is(node) || unit.node.isParentOf(node))
				return { unit: index, offset: 0 };
			continue;
		}
		if (unit.node.is(node)) {
			if (point.offset < unit.start || point.offset > unit.end) continue;
		} else if (
			!unit.children.some((child) => child.is(node) || child.isParentOf(node))
		)
			continue;
		let offset = 0;
		for (const leaf of leaves(unit.children)) {
			if (point.type === "text" && leaf.node.is(node))
				return { unit: index, offset: offset + point.offset };
			if (point.type === "element") {
				const child = $isElementNode(node)
					? node.getChildAtIndex(point.offset)
					: null;
				if (child && (child.is(leaf.node) || child.isParentOf(leaf.node)))
					return { unit: index, offset };
			}
			offset += leaf.size;
		}
		return { unit: index, offset };
	}
	// 表示単位の間（ルートや引用の要素位置）は、直後の単位の先頭とする。
	const child = $isElementNode(node)
		? node.getChildAtIndex(point.offset)
		: null;
	const next = child
		? list.findIndex(
				(unit) => unit.node.is(child) || child.isParentOf(unit.node),
			)
		: -1;
	if (next >= 0) return { unit: next, offset: 0 };
	return { unit: Math.max(list.length - 1, 0), offset: 0 };
}

function select(anchor, focus) {
	const current = $getSelection();
	// 選択中の装飾ノードと同じ1文字を指すときは、PCと同じく装飾の選択を保つ。
	if ($isNodeSelection(current)) {
		const range = nodeRange(current.getNodes()[0], units());
		if (
			range &&
			[range.anchor, range.focus].every(
				(point, index) =>
					point.unit === [anchor, focus][index].unit &&
					point.offset === [anchor, focus][index].offset,
			)
		)
			return;
	}
	const a = pointAt(anchor),
		f = pointAt(focus);
	// 同じ位置へ置き直すときは、太字などの入力待ちの書式を保つため既存の選択を使う。
	if (
		$isRangeSelection(current) &&
		current.anchor.key === a.key &&
		current.anchor.offset === a.offset &&
		current.focus.key === f.key &&
		current.focus.offset === f.offset
	)
		return;
	const selection = $createRangeSelection();
	selection.anchor.set(a.key, a.offset, a.type);
	selection.focus.set(f.key, f.offset, f.type);
	const node = selection.anchor.getNode();
	if ($isTextNode(node)) {
		selection.format = node.getFormat();
		selection.style = node.getStyle();
	}
	$setSelection(selection);
}

const FORMATS = ["bold", "italic", "strikethrough", "code"];

function runs(children) {
	return leaves(children).map(({ node, link }) => {
		if ($isTextNode(node))
			return {
				text: node.getTextContent(),
				formats: FORMATS.filter((format) => node.hasFormat(format)),
				link,
			};
		if ($isLineBreakNode(node)) return { text: "\n", formats: [], link };
		return { decorator: decorator(node), link };
	});
}

function decorator(node) {
	const type = node.getType();
	if (type === "image") return { type, ...$getState(node, imageState) };
	if (type === "tweet") return { type, url: $getState(node, tweetState) };
	if (type === "html" || type === "html-block")
		return { type: "html", value: $getState(node, htmlState) };
	if (type === "footnote-reference")
		return { type, ...$getState(node, footnoteState) };
	if (type === "definition")
		return { type, ...$getState(node, definitionState) };
	return { type };
}

function block(node) {
	if ($isHeadingNode(node))
		return { type: "heading", level: Number(node.getTag().slice(1)) };
	return { type: node.getType() };
}

/** 選択された装飾ノード（区切り線・画像など）を、その1文字を選んだ範囲として返す。 */
function nodeRange(node, list) {
	for (const [index, unit] of list.entries()) {
		let offset = 0;
		for (const leaf of unit.atomic
			? [{ node: unit.node, size: 1 }]
			: leaves(unit.children)) {
			if (leaf.node.is(node))
				return {
					anchor: { unit: index, offset },
					focus: { unit: index, offset: offset + 1 },
				};
			offset += leaf.size;
		}
	}
	return null;
}

function snapshot() {
	const list = units();
	const selection = $getSelection();
	const range = $isRangeSelection(selection) ? selection : null;
	const anchorNode = range?.anchor.getNode();
	const rangePosition = range
		? {
				anchor: positionOf(range.anchor, list),
				focus: positionOf(range.focus, list),
			}
		: null;
	const linkNode = anchorNode
		? [anchorNode, ...anchorNode.getParents()].find($isLinkNode)
		: null;
	return {
		markdown: $convertToMarkdownString(),
		undoDepth: getExtensionDependencyFromEditor(editor, HistoryExtension).output
			.historyState.value.undoStack.length,
		units: list.map(({ node, children, atomic, context, listItems }) => {
			const markers = listItems.map(
				({ node: item, depth, quote, footnote }) => ({
					checked: item.getChecked() ?? null,
					value: item.getValue(),
					depth,
					quote,
					footnote,
				}),
			);
			if (!atomic)
				return {
					block: $isListItemNode(node) ? { type: "paragraph" } : block(node),
					runs: runs(children),
					context,
					listItems: markers,
				};
			return {
				atomic: $isTableNode(node)
					? {
							type: "table",
							rows: node.getChildrenSize(),
							columns: node.getFirstChild()?.getChildrenSize() ?? 0,
						}
					: decorator(node),
				context,
				listItems: markers,
			};
		}),
		selection:
			rangePosition ??
			($isNodeSelection(selection)
				? nodeRange(selection.getNodes()[0], list)
				: null),
		// 装飾ノードの選択中は、PCと同じく文字の入力で置き換えない。
		nodeSelected: $isNodeSelection(selection),
		formats: range ? FORMATS.filter((format) => range.hasFormat(format)) : [],
		blockType: $currentBlockType(),
		link: linkNode ? linkNode.getURL() : null,
	};
}

const commands = {
	enter: KEY_ENTER_COMMAND,
	backspace: DELETE_CHARACTER_COMMAND,
	indent: INDENT_CONTENT_COMMAND,
	outdent: OUTDENT_CONTENT_COMMAND,
	undo: UNDO_COMMAND,
	redo: REDO_COMMAND,
};

globalThis.evameEditorRequest = (json) => {
	for (const callback of timers.splice(0)) callback();
	const input = JSON.parse(json);
	let clipboard;
	failure = null;
	editor.update(
		() => {
			switch (input.action) {
				case "load":
					$convertFromMarkdownString(input.markdown);
					break;
				case "select":
					select(input.anchor, input.focus);
					break;
				case "insert":
					if (input.text === "") {
						if (!$getSelection()?.isCollapsed())
							editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
					} else
						tokenizeRawText(input.text.replace(/\r\n?/g, "\n"), {
							text: (text) => $getSelection()?.insertText(text),
							tab: () => {
								const selection = $getSelection();
								if ($isRangeSelection(selection))
									selection.insertNodes([
										$createTabNode()
											.setFormat(selection.format)
											.setStyle(selection.style),
									]);
							},
							linebreak: () => editor.dispatchCommand(KEY_ENTER_COMMAND, null),
						});
					break;
				case "command": {
					const command = commands[input.name];
					if (!command) throw new Error(`unknown command ${input.name}`);
					editor.dispatchCommand(
						command,
						input.name === "backspace"
							? true
							: input.name === "enter"
								? null
								: undefined,
					);
					break;
				}
				case "format":
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, input.format);
					break;
				case "block":
					$setBlockType(input.type);
					break;
				case "link":
					editor.dispatchCommand(TOGGLE_LINK_COMMAND, input.url || null);
					break;
				case "toggleChecked": {
					const item = units()[input.unit].listItems[input.item];
					item.node.toggleChecked();
					break;
				}
				case "insertTable":
					// PCのメニューと同じ、見出し行つきの3×3の表。
					editor.dispatchCommand(INSERT_TABLE_COMMAND, {
						rows: "3",
						columns: "3",
						includeHeaders: true,
					});
					break;
				case "insertImage":
					$getSelection()?.insertNodes([
						$setState($create(ImageNode), imageState, {
							src: input.src,
							alt: input.alt,
							title: null,
						}),
					]);
					break;
				case "setTableCell": {
					const cell = units()
						[input.unit].node.getChildAtIndex(input.row)
						.getChildAtIndex(input.column);
					cell.clear();
					cell.append(...$generateNodesFromMarkdownString(input.markdown));
					if (cell.getChildrenSize() === 0) cell.append($createParagraphNode());
					break;
				}
				case "copy":
					clipboard = {
						"application/x-lexical-editor": $getLexicalContent(editor),
						"text/plain": $getSelection()?.getTextContent() ?? "",
					};
					break;
				case "paste":
					$insertDataTransferForRichText(
						{ getData: (type) => input.clipboard[type] ?? "" },
						$getSelection(),
						editor,
					);
					break;
				case "tableCells":
					break;
				default:
					throw new Error(`unknown action ${input.action}`);
			}
		},
		{ discrete: true },
	);
	// 読み込んだ文書はUndoで空へ戻さない。
	if (input.action === "load")
		editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
	return editor.read(() => {
		const result = snapshot();
		if (failure) result.failure = String(failure);
		if (clipboard) result.clipboard = clipboard;
		if (input.action === "tableCells")
			result.cells = units()
				[input.unit].node.getChildren()
				.map((row) =>
					row
						.getChildren()
						.map((cell) => $convertToMarkdownString(cell).trim()),
				);
		return JSON.stringify(result);
	});
};
