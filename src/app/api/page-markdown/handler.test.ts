import { expect, it, vi } from "vitest";

const { loadPageDetail } = vi.hoisted(() => ({ loadPageDetail: vi.fn() }));
vi.mock("../_service/load-page-detail", () => ({ loadPageDetail }));

import { getPageMarkdown } from "./handler";

it("空オブジェクト形式の原稿を空のMarkdownファイルとして書き出す", async () => {
	loadPageDetail.mockResolvedValue({
		pageDetail: { title: "空の原稿", mdastJson: {} },
	});
	const response = await getPageMarkdown(
		new Request(
			"https://example.com/api/page-markdown?handle=writer&slug=empty-note",
		),
	);
	expect(response.status).toBe(200);
	expect(await response.text()).toBe("");
});

it("変換できない文書を空のMarkdownファイルとして書き出さない", async () => {
	loadPageDetail.mockResolvedValue({
		pageDetail: {
			title: "文書",
			mdastJson: {
				type: "root",
				children: [{ type: "unsupported-node", value: "残す本文" }],
			},
		},
	});
	await expect(
		getPageMarkdown(
			new Request(
				"https://example.com/api/page-markdown?handle=writer&slug=note",
			),
		),
	).rejects.toThrow(/unsupported-node/);
});
