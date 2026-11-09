import type { Root } from "mdast";
import { unified } from "unified";
import { expect, it } from "vitest";
import { remarkTweet } from "./remark-tweet";

it.each([
	"https://x.com/example/status/12345",
	"https://twitter.com/example/status/12345",
	"https://mobile.twitter.com/example/status/12345",
])("%sの単独リンクを埋め込みへ変換する", (url) => {
	const tree: Root = {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [
					{ type: "link", url, children: [{ type: "text", value: "X" }] },
				],
			},
		],
	};
	expect(unified().use(remarkTweet).runSync(tree).children).toEqual([
		{ type: "html", value: '<tweet data-tweet-id="12345"></tweet>' },
	]);
});
it("文章に混ざったリンクや通常のURLはそのまま残す", () => {
	const tree: Root = {
		type: "root",
		children: [
			{
				type: "paragraph",
				children: [
					{ type: "text", value: "See " },
					{
						type: "link",
						url: "https://x.com/example/status/12345",
						children: [],
					},
				],
			},
			{
				type: "paragraph",
				children: [{ type: "link", url: "https://example.test", children: [] }],
			},
		],
	};
	const before = structuredClone(tree);
	expect(unified().use(remarkTweet).runSync(tree)).toEqual(before);
});
