import type { Link, Paragraph, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

// X / Twitter のステータス URL から tweet ID を抽出
const TWEET_ID_RE =
	/https?:\/\/(?:mobile\.)?(?:twitter\.com|x\.com)\/(?:[^/]+\/status|i\/web\/status)\/(\d+)/i;

/**
 * Markdown 段落内にある Tweet へのリンクを
 * <tweet id="…"></tweet> の raw HTML ノードへ置き換える remark プラグイン。
 */
export const remarkTweet: Plugin<[], Root> = () => (tree: Root) => {
	visit(tree, "paragraph", (paragraph: Paragraph, index, parent) => {
		if (!parent || typeof index !== "number") return;

		// 段落が "リンク1つだけ" で構成されているか判定
		if (paragraph.children.length !== 1) return;
		const onlyChild = paragraph.children[0];
		if (onlyChild.type !== "link") return;

		const link = onlyChild as Link;
		const match = TWEET_ID_RE.exec(link.url);
		if (!match) return;

		// 段落ごと <tweet> ブロックに置換
		const tweetNode = {
			type: "html" as const,
			value: `<tweet id="${match[1]}"></tweet>`,
		};
		(parent.children as (typeof tweetNode)[]).splice(index, 1, tweetNode);
	});
};
