import { mergeAttributes, Node, PasteRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import XView from "./x-view";

export const X = Node.create({
	name: "x",
	group: "block", // ブロック要素として扱う
	atom: true,

	addAttributes() {
		return {
			xId: {
				default: null,
				parseHTML: (el) => el.getAttribute("data-x-id"),
				renderHTML: (attrs) => ({
					"data-x-id": attrs.xId,
					href: `https://x.com/i/web/status/${attrs.xId}`,
					target: "_blank",
					rel: "noopener noreferrer",
				}),
			},
		};
	},

	/* 初期 HTML から a タグを拾う */
	parseHTML() {
		return [
			{
				tag: "a[data-x-id]",
				priority: 1000, // ← Link より先に走るよう念押し
				getAttrs: (dom) => {
					const id = (dom as HTMLAnchorElement).getAttribute("data-x-id");
					return id ? { xId: id } : false;
				},
			},
		];
	},
	renderHTML({ HTMLAttributes }) {
		return ["a", mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(XView); // ← ここで Tweet を描画
	},

	addPasteRules() {
		const re =
			/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/gi;
		return [
			new PasteRule({
				find: re,
				handler: ({ state, range, match }) => {
					const xId = match[1];
					const node = state.schema.nodes[this.name].create({ xId });
					state.tr.replaceWith(range.from, range.to, node).scrollIntoView();
				},
			}),
		];
	},
});
