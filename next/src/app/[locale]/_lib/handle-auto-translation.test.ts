import { beforeEach, describe, expect, it, test, vi } from "vitest";
import {
	handleCommentAutoTranslation,
	handlePageAutoTranslation,
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
				pageSegments: [
					{ number: 1, text: "Hello" },
					{ number: 2, text: "World" },
				],
			},
		},
		{
			name: "ja ➜ en",
			sourceLocale: "ja",
			targetLocale: "en",
			page: {
				title: "テストタイトル",
				pageSegments: [
					{ number: 1, text: "こんにちは" },
					{ number: 2, text: "世界" },
				],
			},
		},
	] as const;

	test.each(cases)("$name", async ({ sourceLocale, targetLocale, page }) => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithPageSegments.mockResolvedValue(page);

		await handlePageAutoTranslation({
			...baseParams,
			sourceLocale,
			dependencies: deps,
		});

		expect(spies.createTranslationJob).toHaveBeenCalledWith(
			expect.objectContaining({ locale: targetLocale }),
		);

		expect(spies.fetchTranslateAPI).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				targetLocale,
				title: page.title,
				numberedElements: page.pageSegments,
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
				dependencies: deps,
			}),
		).rejects.toThrow("Page with page segments not found");
	});

	it("handles multiple target locales", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithPageSegments.mockResolvedValue({
			title: "Title",
			pageSegments: [{ number: 1, text: "Hello" }],
		});

		await handlePageAutoTranslation({
			...baseParams,
			sourceLocale: "en",
			dependencies: deps,
		});

		for (const locale of ["ja", "zh", "ko"]) {
			expect(spies.fetchTranslateAPI).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ targetLocale: locale }),
			);
		}
		expect(spies.delay).toHaveBeenCalledTimes(3);
	});
});

/* ---------------- comment ---------------- */
describe("handleCommentAutoTranslation()", () => {
	const commentParams = {
		...baseParams,
		commentId: 789,
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
					pageCommentSegments: [
						{ number: 1, text: "This is" },
						{ number: 2, text: "a test comment" },
					],
				},
			],
		});

		await handleCommentAutoTranslation({
			...commentParams,
			dependencies: deps,
		});

		expect(spies.fetchTranslateAPI).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				commentId: 789,
				targetLocale: "ja",
			}),
		);
	});

	it("throws if comment missing", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithTitleAndComments.mockResolvedValue({
			id: 1,
			title: "Test Page",
			pageComments: [{ id: 999, pageCommentSegments: [] }],
		});

		await expect(
			handleCommentAutoTranslation({ ...commentParams, dependencies: deps }),
		).rejects.toThrow("Comment with ID 789 not found");
	});

	it("throws if page missing", async () => {
		const { deps, spies } = buildDeps();
		spies.fetchPageWithTitleAndComments.mockResolvedValue(null);

		await expect(
			handleCommentAutoTranslation({ ...commentParams, dependencies: deps }),
		).rejects.toThrow("Page with title and comments not found");
	});
});
