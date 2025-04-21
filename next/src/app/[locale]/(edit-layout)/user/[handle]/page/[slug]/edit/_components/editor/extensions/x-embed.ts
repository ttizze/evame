import { Node, mergeAttributes, PasteRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import XView from "./x-view";

export const X = Node.create({
  name: "x",
  group: "block",
  atom: true,

  /* ----- attrs ----- */
  addAttributes() {
    return {
      xId: {
				default: "",
				render: (value: string) => ({ "data-x-id": value }), // 保存: data-x-id
				parseHTML: (el) => el.getAttribute("xid"), // 読込: data-x-id
      },
    };
  },

  /* ----- HTML <-> Node ----- */
  parseHTML() {
    return [{ tag: "div[data-type='x']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "x" }, HTMLAttributes), // 先に固定属性
    ];
  },

  /* ----- NodeView ----- */
  addNodeView() {
    return ReactNodeViewRenderer(XView);
  },


  /* ----- PasteRule ----- */
  addPasteRules() {
    const re =
      /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/gi;

    return [
      new PasteRule({
        find: re,
        handler: ({ state, range, match }) => {
          const xId = match[1];
          const node = state.schema.nodes[this.name].create({ xId });
          state.tr
            .replaceWith(range.from, range.to, node)
            .scrollIntoView();
        },
      }),
    ];
  },
});
