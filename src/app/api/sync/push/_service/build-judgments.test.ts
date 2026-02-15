import { describe, expect, it, vi } from "vitest";

const { markdownToMdastWithSegmentsMock } = vi.hoisted(() => {
	return { markdownToMdastWithSegmentsMock: vi.fn() };
});
vi.mock("@/app/[locale]/_domain/markdown-to-mdast-with-segments", () => {
	return { markdownToMdastWithSegments: markdownToMdastWithSegmentsMock };
});

const { findPageForSyncMock } = vi.hoisted(() => {
	return { findPageForSyncMock: vi.fn() };
});
vi.mock("./db/queries", () => {
	return { findPageForSync: findPageForSyncMock };
});

import { buildJudgments } from "./build-judgments";

describe("buildJudgments", () => {
	it("dry_runでは画像アップロードを無効にしてMarkdownを解析する", async () => {
		findPageForSyncMock.mockResolvedValue(null);
		markdownToMdastWithSegmentsMock.mockImplementation(
			async (params: { markdown: string }) => ({
				mdastJson: params.markdown,
				segments: [],
				file: {},
			}),
		);

		await buildJudgments("user-1", {
			dry_run: true,
			inputs: [
				{
					slug: "example-slug",
					expected_revision: null,
					title: "Title",
					body: "Body",
					published_at: null,
				},
			],
		});

		expect(markdownToMdastWithSegmentsMock).toHaveBeenCalledWith(
			expect.objectContaining({ autoUploadImages: false }),
		);
	});

	it("通常時は画像アップロードを有効にしてMarkdownを解析する", async () => {
		findPageForSyncMock.mockResolvedValue(null);
		markdownToMdastWithSegmentsMock.mockImplementation(
			async (params: { markdown: string }) => ({
				mdastJson: params.markdown,
				segments: [],
				file: {},
			}),
		);

		await buildJudgments("user-1", {
			inputs: [
				{
					slug: "example-slug",
					expected_revision: null,
					title: "Title",
					body: "Body",
					published_at: null,
				},
			],
		});

		expect(markdownToMdastWithSegmentsMock).toHaveBeenCalledWith(
			expect.objectContaining({ autoUploadImages: true }),
		);
	});
});
