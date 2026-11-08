// iPhoneの編集画面が使う文書モデル。PCと同じMarkdown変換（MarkdownExtension）を、DOMのないJavaScriptCoreで動かす。
// 画面とは、表示単位（段落・項目などの文字の並び、または表・区切り線などの1文字の塊）と、その中の位置だけでやり取りする。
import {
	$getLexicalContent,
	$insertDataTransferForRichText,
} from "@lexical/clipboard";
import { $createCodeNode } from "@lexical/code-core";
import {
	buildEditorFromExtensions,
	getExtensionDependencyFromEditor,
} from "@lexical/extension";
import { HeadlessExtension } from "@lexical/headless";
import { HistoryExtension } from "@lexical/history";
import { $isLinkNode, LinkExtension, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
	$isListItemNode,
	$isListNode,
	CheckListExtension,
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListExtension,
	REMOVE_LIST_COMMAND,
} from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	$generateNodesFromMarkdownString,
} from "@lexical/mdast";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	$isQuoteNode,
	RichTextExtension,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
	$isTableNode,
	INSERT_TABLE_COMMAND,
	TableExtension,
} from "@lexical/table";
import {
	AbortController,
	AbortSignal,
} from "abort-controller/dist/abort-controller.mjs";
import {
	$create,
	$createParagraphNode,
	$createRangeSelection,
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
	INSERT_PARAGRAPH_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { MarkdownExtension } from "../../../src/app/[locale]/_components/editor/markdown";
import {
	ImageNode,
	imageState,
	tweetState,
} from "../../../src/app/[locale]/_components/editor/media-nodes";
import { ShortcutsExtension } from "../../../src/app/[locale]/_components/editor/shortcuts";
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
			RichTextExtension,
			// ブラウザーのない環境では履歴が既定で無効になるため、明示して有効にする。
			configExtension(HistoryExtension, { disabled: false }),
			ListExtension,
			CheckListExtension,
			LinkExtension,
			configExtension(TableExtension, {
				hasCellBackgroundColor: false,
				hasCellMerge: false,
			}),
			MarkdownExtension,
			ShortcutsExtension,
		],
	}),
);
// Lexicalはブロック先頭のBackspaceでブラウザーの選択を測ろうとし、windowがないと例外を投げる。
// DOMのない環境では選択の取得がwindowを参照せずnullを返すため、空のwindowを渡してモデルの処理へ進める。
// https://github.com/meta/lexical/issues/9849
editor._window = {};

const isAtomic = (node) =>
	($isDecoratorNode(node) && !node.isInline()) || $isTableNode(node);
const isInlineOnly = (node) =>
	node
		.getChildren()
		.every((child) => !$isElementNode(child) || child.isInline());

/** 文書を表示単位へ分ける。リスト・引用・脚注は入れ子の文脈として各単位に持たせる。 */
function units() {
	const result = [];
	function visit(container, context) {
		for (const node of container.getChildren()) {
			if (isAtomic(node)) result.push({ node, atomic: true, context });
			else if (!$isElementNode(node)) continue;
			else if ($isListNode(node))
				visit(node, {
					...context,
					lists: [...context.lists, { kind: node.getListType() }],
				});
			else if ($isListItemNode(node) && !isInlineOnly(node))
				visit(node, context);
			else if ($isQuoteNode(node) && node.isShadowRoot())
				visit(node, { ...context, quote: context.quote + 1 });
			// メニューや「> 」の入力で作った引用は段落を持たず、文字を直接持つ。読み込んだ引用と同じ表示にする。
			else if ($isQuoteNode(node))
				result.push({
					node,
					atomic: false,
					context: { ...context, quote: context.quote + 1 },
				});
			else if (node instanceof FootnoteDefinitionNode)
				visit(node, {
					...context,
					footnote: (({ identifier, label }) => label ?? identifier)(
						$getState(node, footnoteState),
					),
				});
			else if (isInlineOnly(node))
				result.push({ node, atomic: false, context });
			else visit(node, context);
		}
	}
	visit($getRoot(), { lists: [], quote: 0, footnote: null });
	return result;
}

/** 表示単位の中の葉。文字はUTF16の長さ、改行・行内の装飾ノードは1文字として数える。 */
function leaves(element, link = null, result = []) {
	for (const child of element.getChildren()) {
		if ($isTextNode(child))
			result.push({ node: child, size: child.getTextContentSize(), link });
		else if ($isElementNode(child))
			leaves(child, $isLinkNode(child) ? child.getURL() : link, result);
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
	const parts = leaves(node);
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
		: { key: node.getKey(), offset: 0, type: "element" };
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
		if (!unit.node.is(node) && !unit.node.isParentOf(node)) continue;
		let offset = 0;
		for (const leaf of leaves(unit.node)) {
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
	if (selection.isCollapsed() && $isTextNode(node)) {
		selection.format = node.getFormat();
		selection.style = node.getStyle();
	}
	$setSelection(selection);
}

const FORMATS = ["bold", "italic", "strikethrough", "code"];

function runs(element) {
	return leaves(element).map(({ node, link }) => {
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
	if ($isListItemNode(node))
		return {
			type: "listitem",
			checked: node.getChecked() ?? null,
			value: node.getValue(),
		};
	return { type: node.getType() };
}

/** 選択された装飾ノード（区切り線・画像など）を、その1文字を選んだ範囲として返す。 */
function nodeRange(node, list) {
	for (const [index, unit] of list.entries()) {
		let offset = 0;
		for (const leaf of unit.atomic
			? [{ node: unit.node, size: 1 }]
			: leaves(unit.node)) {
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
	const blockNode = anchorNode
		? list.find(
				(unit) => unit.node.is(anchorNode) || unit.node.isParentOf(anchorNode),
			)?.node
		: null;
	const linkNode = anchorNode
		? [anchorNode, ...anchorNode.getParents()].find($isLinkNode)
		: null;
	return {
		markdown: $convertToMarkdownString(),
		undoDepth: history().undoStack.length,
		units: list.map(({ node, atomic, context }) => {
			if (!atomic) return { block: block(node), runs: runs(node), context };
			return {
				atomic: $isTableNode(node)
					? {
							type: "table",
							rows: node.getChildrenSize(),
							columns: node.getFirstChild()?.getChildrenSize() ?? 0,
						}
					: decorator(node),
				context,
			};
		}),
		selection: range
			? {
					anchor: positionOf(range.anchor, list),
					focus: positionOf(range.focus, list),
				}
			: $isNodeSelection(selection)
				? nodeRange(selection.getNodes()[0], list)
				: null,
		// 装飾ノードの選択中は、PCと同じく文字の入力で置き換えない。
		nodeSelected: $isNodeSelection(selection),
		formats: range ? FORMATS.filter((format) => range.hasFormat(format)) : [],
		block: blockNode ? block(blockNode) : null,
		listKind:
			blockNode && $isListItemNode(blockNode)
				? blockNode.getParentOrThrow().getListType()
				: null,
		link: linkNode ? linkNode.getURL() : null,
	};
}

function history() {
	return getExtensionDependencyFromEditor(editor, HistoryExtension).output
		.historyState.value;
}

function setBlock(type) {
	const selection = $getSelection();
	if (!$isRangeSelection(selection)) return;
	if (type === "bullet" || type === "number" || type === "check") {
		const anchor = selection.anchor.getNode();
		const item = [anchor, ...anchor.getParents()].find($isListItemNode);
		const current = item?.getParentOrThrow().getListType();
		editor.dispatchCommand(
			current === type
				? REMOVE_LIST_COMMAND
				: {
						bullet: INSERT_UNORDERED_LIST_COMMAND,
						number: INSERT_ORDERED_LIST_COMMAND,
						check: INSERT_CHECK_LIST_COMMAND,
					}[type],
			undefined,
		);
		return;
	}
	const blocks = selection
		.getNodes()
		.map((node) =>
			$isElementNode(node) && !node.isInline()
				? node
				: node.getTopLevelElement(),
		);
	const same = blocks.every((node) =>
		type.startsWith("h")
			? $isHeadingNode(node) && node.getTag() === type
			: node?.getType() === type,
	);
	$setBlocksType(selection, () => {
		if (same || type === "paragraph") return $createParagraphNode();
		if (type === "quote") return $createQuoteNode();
		if (type === "code") return $createCodeNode();
		return $createHeadingNode(type);
	});
}

const commands = {
	enter: INSERT_PARAGRAPH_COMMAND,
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
					$getSelection()?.insertText(input.text);
					break;
				case "command": {
					const command = commands[input.name];
					if (!command) throw new Error(`unknown command ${input.name}`);
					editor.dispatchCommand(
						command,
						input.name === "backspace" ? true : undefined,
					);
					break;
				}
				case "format":
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, input.format);
					break;
				case "block":
					setBlock(input.type);
					break;
				case "link":
					editor.dispatchCommand(TOGGLE_LINK_COMMAND, input.url || null);
					break;
				case "toggleChecked": {
					const { node } = units()[input.unit];
					if ($isListItemNode(node)) node.toggleChecked();
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
