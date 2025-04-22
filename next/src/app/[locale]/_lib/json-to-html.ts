import type { AstNode } from "@/app/types/ast-node";
import type { Element, Root, Text } from "hast";
import rehypeStringify from "rehype-stringify";
// lib/jsonToHtml.ts
import { unified } from "unified";

const tagMap: Record<string, string> = {
	paragraph: "p",
	heading: "h1",
	bulletList: "ul",
	orderedList: "ol",
	listItem: "li",
	image: "img",
};

function walk(node: AstNode): Element | Text {
	if (node.type === "text") {
		return {
			type: "element",
			tagName: "span",
			properties: { "data-hash": node.attrs?.hash },
			children: [{ type: "text", value: node.text ?? "" }],
		};
	}
	return {
		type: "element",
		tagName: tagMap[node.type ?? ""] ?? "div",
		properties: node.attrs ?? {},
		children: (node.content ?? []).map(walk),
	};
}
export function jsonToHtml(root: AstNode): string {
	const hast: Root = { type: "root", children: [walk(root)] };
	return unified().use(rehypeStringify).stringify(hast);
}
