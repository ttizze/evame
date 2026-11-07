import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";

// 表示用ASTから省かれる定義を、コンテナを変更した後も文書内へ残す。
globalThis.evameReferenceDefinitions = (source) => {
	const definitions = [];
	function visit(node) {
		if (node.type === "definition") definitions.push(node);
		for (const child of node.children ?? []) visit(child);
	}
	visit(fromMarkdown(source));
	return definitions.length
		? toMarkdown({ type: "root", children: definitions })
		: "";
};
