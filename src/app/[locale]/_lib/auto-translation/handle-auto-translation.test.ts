import { beforeEach, describe, expect, it, test, vi } from "vitest";
import {
	handlePageAutoTranslation,
	handlePageCommentAutoTranslation,
} from "./handle-auto-translation";

const baseParams = {
	currentUserId: "user123",
	pageId: 1,
	geminiApiKey: "test-api-key",
} as const;

function buildDeps() {
	const createTranslationJob = vi.fn().mockResolvedValue({ id: 123 });
	const fetchPageWithPageSegments = vi.fn();
	const fetchPageWithTitleAndComments = vi.fn();
	const fetchTranslateAPI = vi.fn().mockResolvedValue({ ok: true });
	const delay = vi.fn().mockResolvedValue(undefined);

	const deps = {
		createTranslationJob,
		fetchPageWithPageSegments,
		fetchPageWithTitleAndComments,
		fetchTranslateAPI,
		delay,
	};

	return { deps, spies: deps } as const;
}

beforeEach(() => vi.clearAllMocks());

/* ----------------- page ------------------ */
describe("handlePageAutoTranslation()", () => {
	const cases = [
		{
			name: "en ➜ ja",
			sourceLocale: "en",
			targetLocale: "ja",
			page: {
				title: "Test Title",
				content: {
					segments: [
						{ number: 1, text: "Hello" },
						{ number: 2, text: "World" },
					],
				},
			},
		},
		{
			name: "ja ➜ en",
			sourceLocale: "ja",
			targetLocale: "en",
			page: {
				title: "テストタイトル",
				content: {
					segments: [
						{ number: 1, text: "こんにちは" },
						{ number: 2, text: "世界" },
					],
				},
			},
		},
	] as const;

	test.each(cases)("$name", async ({ sourceLocale, page }) => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithPageSegments.mockResolvedValue(page);

		await handlePageAutoTranslation({
			...baseParams,
			sourceLocale,
			targetLocales: ["en", "zh"],
			dependencies: deps,
		});

		expect(spies.createTranslationJob).toHaveBeenCalledWith(
			expect.objectContaining({ locale: "en" }),
		);

		expect(spies.fetchTranslateAPI).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				targetLocale: "en",
				title: page.title,
				numberedElements: page.content.segments,
			}),
		);

		expect(spies.delay).toHaveBeenCalledWith(1000);
	});

	it("throws if page not found", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithPageSegments.mockResolvedValue(null);

		await expect(
			handlePageAutoTranslation({
				...baseParams,
				sourceLocale: "en",
				targetLocales: ["en", "zh"],
				dependencies: deps,
			}),
		).rejects.toThrow("Page not found");
	});

	it("handles multiple target locales", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithPageSegments.mockResolvedValue({
			title: "Title",
			content: {
				segments: [{ number: 1, text: "Hello" }],
			},
		});

		await handlePageAutoTranslation({
			...baseParams,
			sourceLocale: "en",
			targetLocales: ["en", "zh"],
			dependencies: deps,
		});

		for (const _locale of ["ja", "zh"]) {
			expect(spies.fetchTranslateAPI).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ targetLocale: "en" }),
			);
		}
		expect(spies.delay).toHaveBeenCalledTimes(2);
	});
});

/* ---------------- comment ---------------- */
describe("handlePageCommentAutoTranslation()", () => {
	const commentParams = {
		...baseParams,
		pageCommentId: 789,
		content: "This is a test comment",
		sourceLocale: "en",
	} as const;

	it("translates comment", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithTitleAndComments.mockResolvedValue({
			id: 1,
			title: "Test Page",
			pageComments: [
				{
					id: 789,
					content: {
						segments: [
							{ number: 1, text: "This is" },
							{ number: 2, text: "a test comment" },
						],
					},
				},
			],
		});

		await handlePageCommentAutoTranslation({
			...commentParams,
			targetLocales: ["en", "zh"],
			dependencies: deps,
		});

		expect(spies.fetchTranslateAPI).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				pageCommentId: 789,
			}),
		);
	});

	it("throws if comment missing", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithTitleAndComments.mockResolvedValue({
			id: 1,
			title: "Test Page",
			pageComments: [{ id: 999, content: { segments: [] } }],
		});

		await expect(
			handlePageCommentAutoTranslation({
				...commentParams,
				targetLocales: ["en", "zh"],
				dependencies: deps,
			}),
		).rejects.toThrow("Comment not found");
	});

	it("throws if page missing", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithTitleAndComments.mockResolvedValue(null);

		await expect(
			handlePageCommentAutoTranslation({
				...commentParams,
				targetLocales: ["en", "zh"],
				dependencies: deps,
			}),
		).rejects.toThrow("Page not found");
	});
});
