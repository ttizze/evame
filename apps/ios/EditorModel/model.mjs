import {
	chainCommands,
	deleteSelection,
	joinBackward,
	joinTextblockBackward,
} from "prosemirror-commands";
import { Schema } from "prosemirror-model";
import { schema as basic } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { EditorState, TextSelection } from "prosemirror-state";

let nodes = addListNodes(basic.spec.nodes, "paragraph block*", "block");
for (const [name, attrs] of [
	["code_block", { language: { default: null } }],
	["list_item", { checkbox: { default: null } }],
	["hard_break", { soft: { default: false } }],
	["image", { evameAlt: { default: null } }],
]) {
	const spec = nodes.get(name);
	nodes = nodes.update(name, { ...spec, attrs: { ...spec.attrs, ...attrs } });
}
let marks = basic.spec.marks.append({ strike: {} });
marks = marks.update("code", { ...marks.get("code"), excludes: "" });
for (const name of ["em", "strong", "strike", "link", "code"]) {
	const spec = marks.get(name);
	marks = marks.update(name, {
		...spec,
		attrs: { ...spec.attrs, evameLevels: { default: [] } },
	});
}
const schema = new Schema({ nodes, marks });

// DOMやEditorViewを作らず、入力で指定された不変の文書へモデル演算だけを適用する。
globalThis.evameBackspace = (json) => {
	const input = JSON.parse(json);
	const doc = schema.nodeFromJSON(input.doc);
	let position = 0;
	let node = doc;
	for (const index of input.path) {
		if (node !== doc) position++;
		for (let i = 0; i < index; i++) position += node.child(i).nodeSize;
		node = node.child(index);
	}
	let state = EditorState.create({
		doc,
		selection: TextSelection.create(doc, position + 1),
	});
	const handled = chainCommands(
		deleteSelection,
		joinTextblockBackward,
		joinBackward,
	)(state, (transaction) => {
		state = state.apply(transaction);
	});
	if (!handled || !(state.selection instanceof TextSelection)) return "null";
	const cursor = state.selection.$from;
	const path = [];
	for (let depth = 0; depth < cursor.depth; depth++)
		path.push(cursor.index(depth));
	return JSON.stringify({
		doc: state.doc.toJSON(),
		path,
		before: cursor.parent.content.cut(0, cursor.parentOffset).toJSON() ?? [],
	});
};
