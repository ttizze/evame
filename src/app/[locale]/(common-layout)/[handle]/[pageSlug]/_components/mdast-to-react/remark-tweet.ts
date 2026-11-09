import type { Paragraph, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";

/** 単独のX/Twitterリンクだけを埋め込みへ変換する。 */
export const remarkTweet: Plugin<[], Root> = () => (tree: Root) => {
	visit(tree, "paragraph", (paragraph: Paragraph, index, parent) => {
		if (!parent || typeof index !== "number" || paragraph.children.length !== 1)
			return;
		const child = paragraph.children[0];
		if (child?.type !== "link") return;
		const id = getXPostId(child.url);
		if (!id) return;
		parent.children.splice(index, 1, {
			type: "html",
			value: `<tweet data-tweet-id="${id}"></tweet>`,
		});
	});
};
