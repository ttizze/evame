import { TranslationStatus } from "@prisma/client";
import type { Queue } from "bullmq";
import { describe, expect, test, vi } from "vitest";
import { getTranslateUserQueue } from "~/features/translate/translate-user-queue";
import type { TranslateJobParams } from "~/features/translate/types";
import { createUserAITranslationInfo } from "~/routes/$locale+/user.$handle+/page+/$slug+/functions/mutations.server";
import { fetchPageWithPageSegments } from "~/routes/$locale+/user.$handle+/page+/$slug+/functions/queries.server";
import { TranslationIntent } from "~/routes/$locale+/user.$handle+/page+/$slug+/index";
import { prisma } from "~/utils/prisma";
import { handlePageTranslation } from "./handlePageTranslation";
interface PageSegment {
	id: number;
	pageId: number;
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	createdAt: Date;
	updatedAt: Date;
	pageSegmentTranslations: Array<{
		id: number;
		locale: string;
		text: string;
		isArchived: boolean;
	}>;
}

vi.mock("~/utils/prisma", () => ({
	prisma: {
		pageSegment: {
			findFirst: vi.fn(),
		},
	},
}));

// Mock dependencies
vi.mock(
	"~/routes/$locale+/user.$handle+/page+/$slug+/functions/mutations.server",
	() => ({
		createUserAITranslationInfo: vi.fn(),
	}),
);

vi.mock(
	"~/routes/$locale+/user.$handle+/page+/$slug+/functions/queries.server",
	() => ({
		fetchPageWithPageSegments: vi.fn(),
	}),
);

vi.mock("~/features/translate/translate-user-queue", () => ({
	getTranslateUserQueue: vi.fn(),
}));

describe("handlePageTranslation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("should handle English to Japanese translation correctly", async () => {
		// Setup mocks
		const mockUserAITranslationInfo = {
			id: 1,
			userId: 1,
			pageId: 1,
			locale: "ja",
			aiModel: "gemini-1.5-flash",
			aiTranslationStatus: TranslationStatus.PENDING,
			aiTranslationProgress: 0,
			createdAt: new Date(),
		};
		const mockPageWithPageSegments = {
			id: 1,
			title: "Test Title",
			slug: "test-title",
			content: "Test content",
			createdAt: new Date(),
			pageSegments: [
				{ id: 1, number: 0, text: "Title" },
				{ id: 2, number: 1, text: "Content" },
			],
		};
		const mockQueue = {
			add: vi.fn(),
			token: "",
			jobsOpts: {},
			opts: {},
			libName: "bull",
		} as unknown as Queue<TranslateJobParams>;

		vi.mocked(createUserAITranslationInfo).mockResolvedValue(
			mockUserAITranslationInfo,
		);
		vi.mocked(fetchPageWithPageSegments).mockResolvedValue(
			mockPageWithPageSegments,
		);
		vi.mocked(getTranslateUserQueue).mockReturnValue(mockQueue);

		// Execute
		await handlePageTranslation({
			currentUserId: 1,
			pageId: 1,
			sourceLanguage: "en",
			geminiApiKey: "test-key",
			title: "Test Title",
		});

		// Verify
		expect(createUserAITranslationInfo).toHaveBeenCalledWith(
			1,
			1,
			"ja",
			"gemini-1.5-flash",
		);
		expect(fetchPageWithPageSegments).toHaveBeenCalledWith(1);
		expect(getTranslateUserQueue).toHaveBeenCalledWith(1);
		expect(mockQueue.add).toHaveBeenCalledWith("translate-1", {
			userAITranslationInfoId: 1,
			geminiApiKey: "test-key",
			aiModel: "gemini-1.5-flash",
			userId: 1,
			pageId: 1,
			locale: "ja",
			title: "Test Title",
			numberedElements: [
				{ number: 0, text: "Title" },
				{ number: 1, text: "Content" },
			],
			translationIntent: TranslationIntent.TRANSLATE_PAGE,
		});
	});

	test("should handle Japanese to English translation correctly", async () => {
		// Setup mocks
		const mockUserAITranslationInfo = {
			id: 1,
			userId: 1,
			pageId: 1,
			locale: "en",
			aiModel: "gemini-1.5-flash",
			aiTranslationStatus: TranslationStatus.PENDING,
			aiTranslationProgress: 0,
			createdAt: new Date(),
		};
		const mockPageWithPageSegments = {
			id: 1,
			title: "テストタイトル",
			slug: "test-title",
			content: "テスト内容",
			createdAt: new Date(),
			pageSegments: [
				{ id: 1, number: 0, text: "タイトル" },
				{ id: 2, number: 1, text: "内容" },
			],
		};
		const mockQueue = {
			add: vi.fn(),
			token: "",
			jobsOpts: {},
			opts: {},
			libName: "bull",
		} as unknown as Queue<TranslateJobParams>;

		vi.mocked(createUserAITranslationInfo).mockResolvedValue(
			mockUserAITranslationInfo,
		);
		vi.mocked(fetchPageWithPageSegments).mockResolvedValue(
			mockPageWithPageSegments,
		);
		vi.mocked(getTranslateUserQueue).mockReturnValue(mockQueue);

		// Execute
		await handlePageTranslation({
			currentUserId: 1,
			pageId: 1,
			sourceLanguage: "ja",
			geminiApiKey: "test-key",
			title: "テストタイトル",
		});

		// Verify
		expect(createUserAITranslationInfo).toHaveBeenCalledWith(
			1,
			1,
			"en",
			"gemini-1.5-flash",
		);
		expect(mockQueue.add).toHaveBeenCalledWith(
			"translate-1",
			expect.objectContaining({
				locale: "en",
			}),
		);
	});

	test("should throw error when page is not found", async () => {
		// Setup mocks
		vi.mocked(createUserAITranslationInfo).mockResolvedValue({
			id: 1,
			userId: 1,
			pageId: 1,
			locale: "ja",
			aiModel: "gemini-1.5-flash",
			aiTranslationStatus: TranslationStatus.PENDING,
			aiTranslationProgress: 0,
			createdAt: new Date(),
		});
		vi.mocked(fetchPageWithPageSegments).mockResolvedValue(null);

		// Execute & Verify
		await expect(
			handlePageTranslation({
				currentUserId: 1,
				pageId: 1,
				sourceLanguage: "en",
				geminiApiKey: "test-key",
				title: "Test Title",
			}),
		).rejects.toThrow("Page with page segments not found");
	});

	test("should not translate when translation already exists", async () => {
		// Setup mocks
		vi.mocked(prisma.pageSegment.findFirst).mockResolvedValue({
			id: 1,
			pageId: 1,
			number: 0,
			text: "Title",
			textAndOccurrenceHash: "hash",
			createdAt: new Date(),
			updatedAt: new Date(),
			pageSegmentTranslations: [
				{
					id: 1,
					locale: "ja",
					text: "タイトル",
					isArchived: false,
				},
			],
		} as PageSegment & {
			pageSegmentTranslations: Array<{
				id: number;
				locale: string;
				text: string;
				isArchived: boolean;
			}>;
		});

		// Execute
		await handlePageTranslation({
			currentUserId: 1,
			pageId: 1,
			sourceLanguage: "en",
			geminiApiKey: "test-key",
			title: "Test Title",
		});

		// Verify that no translation was attempted
		expect(createUserAITranslationInfo).not.toHaveBeenCalled();
		expect(fetchPageWithPageSegments).not.toHaveBeenCalled();
		expect(getTranslateUserQueue).not.toHaveBeenCalled();
	});

	test("should not translate when Japanese translation already exists", async () => {
		// Setup mocks
		vi.mocked(prisma.pageSegment.findFirst).mockResolvedValue({
			id: 1,
			pageId: 1,
			number: 0,
			text: "Title",
			textAndOccurrenceHash: "hash",
			createdAt: new Date(),
			updatedAt: new Date(),
			pageSegmentTranslations: [
				{
					id: 1,
					locale: "ja",
					text: "タイトル",
					isArchived: false,
				},
			],
		} as PageSegment & {
			pageSegmentTranslations: Array<{
				id: number;
				locale: string;
				text: string;
				isArchived: boolean;
			}>;
		});

		// Execute
		await handlePageTranslation({
			currentUserId: 1,
			pageId: 1,
			sourceLanguage: "en",
			geminiApiKey: "test-key",
			title: "Test Title",
		});

		// Verify that no translation was attempted
		expect(createUserAITranslationInfo).not.toHaveBeenCalled();
		expect(fetchPageWithPageSegments).not.toHaveBeenCalled();
		expect(getTranslateUserQueue).not.toHaveBeenCalled();
	});

	test("should not translate when English translation already exists", async () => {
		// Setup mocks
		vi.mocked(prisma.pageSegment.findFirst).mockResolvedValue({
			id: 1,
			pageId: 1,
			number: 0,
			text: "タイトル",
			textAndOccurrenceHash: "hash",
			createdAt: new Date(),
			updatedAt: new Date(),
			pageSegmentTranslations: [
				{
					id: 1,
					locale: "en",
					text: "Title",
					isArchived: false,
				},
			],
		} as PageSegment & {
			pageSegmentTranslations: Array<{
				id: number;
				locale: string;
				text: string;
				isArchived: boolean;
			}>;
		});

		// Execute
		await handlePageTranslation({
			currentUserId: 1,
			pageId: 1,
			sourceLanguage: "ja",
			geminiApiKey: "test-key",
			title: "タイトル",
		});

		// Verify that no translation was attempted
		expect(createUserAITranslationInfo).not.toHaveBeenCalled();
		expect(fetchPageWithPageSegments).not.toHaveBeenCalled();
		expect(getTranslateUserQueue).not.toHaveBeenCalled();
	});

	test("should translate when translation is archived", async () => {
		// Setup mocks for initial translation check
		vi.mocked(prisma.pageSegment.findFirst).mockResolvedValueOnce({
			id: 1,
			pageId: 1,
			number: 0,
			text: "Title",
			textAndOccurrenceHash: "hash",
			createdAt: new Date(),
				updatedAt: new Date(),
				pageSegmentTranslations: [], // No active translations
		} as PageSegment & {
			pageSegmentTranslations: Array<{
				id: number;
				locale: string;
				text: string;
				isArchived: boolean;
			}>;
		});

		const mockUserAITranslationInfo = {
			id: 1,
			userId: 1,
			pageId: 1,
			locale: "ja",
			aiModel: "gemini-1.5-flash",
			aiTranslationStatus: TranslationStatus.PENDING,
			aiTranslationProgress: 0,
			createdAt: new Date(),
		};
		const mockPageWithPageSegments = {
			id: 1,
			title: "Test Title",
			slug: "test-title",
			content: "Test content",
			createdAt: new Date(),
			pageSegments: [{ id: 1, number: 0, text: "Title" }],
		};
		const mockQueue = {
			add: vi.fn(),
			token: "",
			jobsOpts: {},
			opts: {},
			libName: "bull",
		} as unknown as Queue<TranslateJobParams>;

		vi.mocked(createUserAITranslationInfo).mockResolvedValue(
			mockUserAITranslationInfo,
		);
		vi.mocked(fetchPageWithPageSegments).mockResolvedValue(
			mockPageWithPageSegments,
		);
		vi.mocked(getTranslateUserQueue).mockReturnValue(mockQueue);

		// Execute
		await handlePageTranslation({
			currentUserId: 1,
			pageId: 1,
			sourceLanguage: "en",
			geminiApiKey: "test-key",
			title: "Test Title",
		});

		// Verify that translation was attempted
		expect(createUserAITranslationInfo).toHaveBeenCalled();
		expect(fetchPageWithPageSegments).toHaveBeenCalled();
		expect(getTranslateUserQueue).toHaveBeenCalled();
	});
});
