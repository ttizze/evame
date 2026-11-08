import {
	$getLexicalContent,
	$insertDataTransferForRichText,
} from "@lexical/clipboard";
import {
	$createLineBreakNode,
	$createRangeSelection,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isTextNode,
	$setSelection,
	CLEAR_HISTORY_COMMAND,
	DELETE_CHARACTER_COMMAND,
	FORMAT_TEXT_COMMAND,
	HISTORY_PUSH_TAG,
	INDENT_CONTENT_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
} from "lexical";

function fields(root) {
	const result = [];
	function visit(node, lists) {
		if (!$isElementNode(node)) return;
		if (node.getType() === "list")
			lists = [...lists, { kind: node.getListType(), start: node.getStart() }];
		const children = node.getChildren();
		if (
			["paragraph", "heading", "quote", "code", "listitem"].includes(
				node.getType(),
			) &&
			children.every((child) => !$isElementNode(child) || child.isInline())
		)
			result.push({ node, lists });
		else
			children.forEach((child) => {
				visit(child, lists);
			});
	}
	visit(root, []);
	return result;
}

function pointAt(node, offset) {
	if ($isTextNode(node)) return { key: node.getKey(), offset, type: "text" };
	for (const child of node.getChildren()) {
		const length = child.getTextContentSize();
		if (offset <= length && $isTextNode(child)) return pointAt(child, offset);
		if (offset <= length && $isElementNode(child))
			return pointAt(child, offset);
		if (offset < length)
			return {
				key: node.getKey(),
				offset: child.getIndexWithinParent(),
				type: "element",
			};
		offset -= length;
	}
	if (offset !== 0) throw new Error("selection offset is out of range");
	return {
		key: node.getKey(),
		offset: node.getChildrenSize(),
		type: "element",
	};
}

function pointIn(position) {
	const field = fields($getRoot())[position.field]?.node;
	if (
		!field ||
		position.offset < 0 ||
		position.offset > field.getTextContentSize()
	)
		throw new Error("invalid field selection");
	return pointAt(field, position.offset);
}

function select(anchorPosition, focusPosition) {
	const selection = $createRangeSelection();
	const anchor = pointIn(anchorPosition),
		focus = pointIn(focusPosition);
	selection.anchor.set(anchor.key, anchor.offset, anchor.type);
	selection.focus.set(focus.key, focus.offset, focus.type);
	$setSelection(selection);
}

function fieldOffset(field, point) {
	const prefix = $createRangeSelection();
	prefix.anchor.set(field.getKey(), 0, "element");
	prefix.focus.set(point.key, point.offset, point.type);
	return prefix.getTextContent().length;
}

export function install(editor, importSource, exportSource) {
	const commands = {
		enter: INSERT_PARAGRAPH_COMMAND,
		backspace: DELETE_CHARACTER_COMMAND,
		indent: INDENT_CONTENT_COMMAND,
		outdent: OUTDENT_CONTENT_COMMAND,
		format: FORMAT_TEXT_COMMAND,
		undo: UNDO_COMMAND,
		redo: REDO_COMMAND,
	};
	globalThis.evameLexicalRequest = (json) => {
		const input = JSON.parse(json);
		if (input.action === "restore")
			editor.setEditorState(editor.parseEditorState({ root: input.root }));
		editor.update(
			() => {
				if (input.action === "load") {
					editor.dispatchCommand(CLEAR_HISTORY_COMMAND);
					importSource(input.source);
				} else if (input.action === "select" || input.action === "restore") {
					if (input.end < input.start)
						throw new Error("invalid field selection");
					select(
						{ field: input.field, offset: input.start },
						{ field: input.field, offset: input.end },
					);
				} else if (input.action === "selectAcross")
					select(input.anchor, input.focus);
				else if (input.action === "paste")
					$insertDataTransferForRichText(
						{ getData: (type) => input.clipboard[type] ?? "" },
						$getSelection(),
						editor,
					);
				else if (input.action === "insert")
					$getSelection().insertText(input.text);
				else if (input.action === "command") {
					const command = commands[input.name];
					if (!command) throw new Error(`unknown command ${input.name}`);
					editor.dispatchCommand(
						command,
						input.name === "backspace" ? true : input.format,
					);
				} else if (input.action === "replaceField") {
					const field = fields($getRoot())[input.field]?.node;
					if (!field) throw new Error("invalid field");
					field.clear();
					for (const run of input.runs) {
						if (run.break) field.append($createLineBreakNode());
						else {
							const node = $createTextNode(run.text);
							for (const format of run.formats) node.toggleFormat(format);
							field.append(node);
						}
					}
				} else if (input.action !== "read" && input.action !== "copy")
					throw new Error(`unknown action ${input.action}`);
			},
			{
				discrete: true,
				tag:
					input.action === "insert" ||
					input.action === "paste" ||
					input.action === "command" ||
					input.action === "replaceField"
						? HISTORY_PUSH_TAG
						: undefined,
			},
		);
		return editor.read(() => {
			const root = $getRoot();
			const selection = $getSelection();
			const entries = fields(root);
			const position = (point) => {
				const field = entries.findIndex(
					({ node }) =>
						node.is(point.getNode()) || node.isParentOf(point.getNode()),
				);
				return field >= 0
					? { field, offset: fieldOffset(entries[field].node, point) }
					: null;
			};
			const anchor = selection?.anchor ? position(selection.anchor) : null;
			const focus = selection?.focus ? position(selection.focus) : null;
			return JSON.stringify({
				markdown: exportSource(),
				text: root.getTextContent(),
				root: editor.getEditorState().toJSON().root,
				fields: entries.map(({ node, lists }) => ({
					type: node.getType(),
					text: node.getTextContent(),
					lists,
				})),
				selection:
					anchor && focus
						? {
								field: anchor.field,
								anchor: anchor.offset,
								focusField: focus.field,
								focus: focus.offset,
							}
						: null,
				// Lexical標準の書き出しのうちHTMLだけはDOMを必要とするため、残る2形式を同じ関数で生成する。
				clipboard:
					input.action === "copy"
						? {
								"application/x-lexical-editor": $getLexicalContent(editor),
								"text/plain": selection.getTextContent(),
							}
						: undefined,
			});
		});
	};
}
