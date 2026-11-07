import {
	chainCommands,
	deleteSelection,
	joinBackward,
	joinTextblockBackward,
} from "prosemirror-commands";
import { Schema } from "prosemirror-model";
import { schema as basic } from "prosemirror-schema-basic";
import {
	addListNodes,
	liftListItem,
	sinkListItem,
} from "prosemirror-schema-list";
import { EditorState, TextSelection } from "prosemirror-state";

let nodes = addListNodes(basic.spec.nodes, "block+", "block");
for (const [name, attrs] of [
	["code_block", { language: { default: null } }],
	["list_item", { checkbox: { default: null } }],
	["hard_break", { soft: { default: false } }],
]) {
	const spec = nodes.get(name);
	nodes = nodes.update(name, { ...spec, attrs: { ...spec.attrs, ...attrs } });
}
// 表のセル編集は専用画面が担う。リスト操作では内容を一つのブロックとして保持する。
nodes = nodes.append({
	table: { group: "block", atom: true, attrs: { source: {} } },
});
nodes = nodes.update("image", {
	inline: true,
	group: "inline",
	atom: true,
	attrs: { source: {} },
});
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
const commands = {
	backspace: chainCommands(
		deleteSelection,
		joinTextblockBackward,
		joinBackward,
	),
	indent: sinkListItem(schema.nodes.list_item),
	outdent(state, dispatch) {
		const range = state.selection.$from.blockRange(
			state.selection.$to,
			(node) =>
				node.childCount > 0 && node.firstChild.type === schema.nodes.list_item,
		);
		return liftListItem(schema.nodes.list_item)(state, (transaction) => {
			// 標準コマンドが分割した後続リストへ、元の項目番号を引き継ぐ。
			if (
				range?.parent.type === schema.nodes.ordered_list &&
				range.endIndex < range.parent.childCount
			) {
				const next = transaction.doc.resolve(
					transaction.mapping.map(range.end + 1),
				);
				for (let depth = next.depth; depth > 0; depth--) {
					if (next.node(depth).type !== schema.nodes.ordered_list) continue;
					transaction.setNodeMarkup(next.before(depth), undefined, {
						...next.node(depth).attrs,
						order: range.parent.attrs.order + range.endIndex,
					});
					break;
				}
			}
			dispatch(transaction);
		});
	},
};

// DOMやEditorViewを作らず、入力で指定された不変の文書へモデル演算だけを適用する。
globalThis.evameEditorCommand = (json) => {
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
	const handled = commands[input.command](state, (transaction) => {
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
