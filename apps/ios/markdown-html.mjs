import htmlToDOM from "html-dom-parser";

// Attribute order and the renderer's final LF do not change the document.
// Whitespace inside the document is significant and remains in the comparison.
export function htmlTree(html) {
	function nodes(entries) {
		return entries.map((node) =>
			node.type === "text" || node.type === "comment"
				? [node.type, node.data]
				: [
						node.type,
						node.name,
						Object.entries(node.attribs ?? {}).sort(([a], [b]) =>
							a.localeCompare(b),
						),
						nodes(node.children ?? []),
					],
		);
	}
	return nodes(htmlToDOM(html.replace(/\n$/, "")));
}
