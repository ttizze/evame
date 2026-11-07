import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";
import { defaultHandlers, toMarkdown } from "mdast-util-to-markdown";

globalThis.evameMarkdownSource = (json) =>
	toMarkdown(JSON.parse(json), {
		bullet: "-",
		resourceLink: true,
		extensions: [gfmToMarkdown({ tablePipeAlign: false })],
		handlers: {
			image(node, parent, state, info) {
				return `!${defaultHandlers.link(node, parent, state, info)}`;
			},
		},
	}).replace(/\n$/, "");

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
