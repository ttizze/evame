import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	handleCommentAutoTranslation,
	handlePageAutoTranslation,
} from "./handle-auto-translation";

describe("handleAutoTranslation", () => {
	// 共通のモックオブジェクト
	const mockCreateUserAITranslationInfo = vi
		.fn()
		.mockResolvedValue({ id: 123 });
	const mockCreatePageAITranslationInfo = vi
		.fn()
		.mockResolvedValue({ id: 456 });
	const mockFetchPageWithPageSegments = vi.fn();
	const mockFetchPageWithTitleAndComments = vi.fn();
	const mockFetchTranslateAPI = vi.fn().mockResolvedValue({ ok: true });
	const mockDelay = vi.fn().mockResolvedValue(undefined);
	const mockHasExistingTranslation = vi.fn();

	// 共通の依存関係
	const mockDependencies = {
		createUserAITranslationInfo: mockCreateUserAITranslationInfo,
		createPageAITranslationInfo: mockCreatePageAITranslationInfo,
		fetchPageWithPageSegments: mockFetchPageWithPageSegments,
		fetchPageWithTitleAndComments: mockFetchPageWithTitleAndComments,
		fetchTranslateAPI: mockFetchTranslateAPI,
		delay: mockDelay,
	};

	// 共通のパラメータ
	const baseParams = {
		currentUserId: "user123",
		pageId: 1,
		sourceLocale: "en",
		geminiApiKey: "test-api-key",
	};

	beforeEach(async () => {
		vi.clearAllMocks();
	});
	describe("handlePageAutoTranslation", () => {
		it("should process translation from English to Japanese", async () => {
			// 既存の翻訳がない場合のモック
			mockHasExistingTranslation.mockResolvedValue(false);

			// ページデータのモック
			const mockPageData = {
				title: "Test Title",
				pageSegments: [
					{ number: 1, text: "Hello" },
					{ number: 2, text: "World" },
				],
			};
			mockFetchPageWithPageSegments.mockResolvedValue(mockPageData);

			await handlePageAutoTranslation({
				...baseParams,
				dependencies: mockDependencies,
			});

			expect(mockCreateUserAITranslationInfo).toHaveBeenCalledWith(
				baseParams.currentUserId,
				baseParams.pageId,
				"ja",
				"gemini-1.5-flash",
			);
			expect(mockFetchPageWithPageSegments).toHaveBeenCalledWith(
				baseParams.pageId,
			);

			// 翻訳APIが正しいパラメータで呼ばれたことを確認
			expect(mockFetchTranslateAPI).toHaveBeenCalledWith(
				"http://localhost:3000/api/translate",
				expect.objectContaining({
					userAITranslationInfoId: 123,
					pageAITranslationInfoId: 456,
					geminiApiKey: baseParams.geminiApiKey,
					aiModel: "gemini-1.5-flash",
					userId: baseParams.currentUserId,
					pageId: baseParams.pageId,
					targetLocale: "ja",
					title: "Test Title",
					numberedElements: [
						{ number: 1, text: "Hello" },
						{ number: 2, text: "World" },
					],
					translateTarget: "page",
				}),
			);

			// 遅延処理が呼ばれたことを確認
			expect(mockDelay).toHaveBeenCalledWith(1000);
		});

		it("should process translation from Japanese to English", async () => {
			// 日本語から英語への翻訳パラメータ
			const jaParams = {
				...baseParams,
				sourceLocale: "ja",
			};

			// 日本語のページデータのモック
			const mockPageData = {
				title: "テストタイトル",
				pageSegments: [
					{ number: 1, text: "こんにちは" },
					{ number: 2, text: "世界" },
				],
			};
			mockFetchPageWithPageSegments.mockResolvedValue(mockPageData);

			await handlePageAutoTranslation({
				...jaParams,
				dependencies: mockDependencies,
			});

			expect(mockCreateUserAITranslationInfo).toHaveBeenCalledWith(
				jaParams.currentUserId,
				jaParams.pageId,
				"en",
				"gemini-1.5-flash",
			);

			// 翻訳APIが正しいパラメータで呼ばれたことを確認
			expect(mockFetchTranslateAPI).toHaveBeenCalledWith(
				"http://localhost:3000/api/translate",
				expect.objectContaining({
					targetLocale: "en",
					title: "テストタイトル",
				}),
			);
		});

		it("should throw error if page segments not found", async () => {
			// 既存の翻訳がない場合のモック
			mockHasExistingTranslation.mockResolvedValue(false);

			// ページデータが見つからない場合のモック
			mockFetchPageWithPageSegments.mockResolvedValue(null);

			// エラーがスローされることを確認
			await expect(
				handlePageAutoTranslation({
					...baseParams,
					dependencies: mockDependencies,
				}),
			).rejects.toThrow("Page with page segments not found");
		});
	});

	describe("handleCommentAutoTranslation", () => {
		// コメント翻訳用のパラメータ
		const commentParams = {
			...baseParams,
			commentId: 789,
			content: "This is a test comment",
		};

		it("should process comment translation", async () => {
			// 既存の翻訳がない場合のモック
			mockHasExistingTranslation.mockResolvedValue(false);

			// ページとコメントデータのモック
			const mockPageWithComments = {
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
			};
			mockFetchPageWithTitleAndComments.mockResolvedValue(mockPageWithComments);

			await handleCommentAutoTranslation({
				...commentParams,
				dependencies: mockDependencies,
			});

			expect(mockCreateUserAITranslationInfo).toHaveBeenCalledWith(
				commentParams.currentUserId,
				commentParams.pageId,
				"ja",
				"gemini-1.5-flash",
			);
			expect(mockFetchPageWithTitleAndComments).toHaveBeenCalledWith(
				commentParams.pageId,
			);

			// 翻訳APIが正しいパラメータで呼ばれたことを確認
			expect(mockFetchTranslateAPI).toHaveBeenCalledWith(
				"http://localhost:3000/api/translate",
				expect.objectContaining({
					userAITranslationInfoId: 123,
					pageAITranslationInfoId: 456,
					geminiApiKey: commentParams.geminiApiKey,
					aiModel: "gemini-1.5-flash",
					userId: commentParams.currentUserId,
					pageId: commentParams.pageId,
					commentId: commentParams.commentId,
					targetLocale: "ja",
					title: "Test Page",
					numberedElements: [
						{ number: 1, text: "This is" },
						{ number: 2, text: "a test comment" },
						{ number: 0, text: "Test Page" },
					],
					translateTarget: "comment",
				}),
			);
		});

		it("should throw error if comment not found", async () => {
			// 既存の翻訳がない場合のモック
			mockHasExistingTranslation.mockResolvedValue(false);

			// ページは存在するがコメントが見つからない場合のモック
			const mockPageWithComments = {
				id: 1,
				title: "Test Page",
				pageComments: [
					// コメントID 789 が存在しない
					{ id: 999, pageCommentSegments: [] },
				],
			};
			mockFetchPageWithTitleAndComments.mockResolvedValue(mockPageWithComments);

			// エラーがスローされることを確認
			await expect(
				handleCommentAutoTranslation({
					...commentParams,
					dependencies: mockDependencies,
				}),
			).rejects.toThrow("Comment with ID 789 not found");
		});

		it("should throw error if page with comments not found", async () => {
			// 既存の翻訳がない場合のモック
			mockHasExistingTranslation.mockResolvedValue(false);

			// ページが見つからない場合のモック
			mockFetchPageWithTitleAndComments.mockResolvedValue(null);

			// エラーがスローされることを確認
			await expect(
				handleCommentAutoTranslation({
					...commentParams,
					dependencies: mockDependencies,
				}),
			).rejects.toThrow("Page with title and comments not found");
		});
	});

	it("should handle multiple target locales", async () => {
		// 既存の翻訳がない場合のモック
		mockHasExistingTranslation.mockResolvedValue(false);

		// ページデータのモック
		const mockPageData = {
			title: "Test Title",
			pageSegments: [{ number: 1, text: "Hello World" }],
		};
		mockFetchPageWithPageSegments.mockResolvedValue(mockPageData);

		await handlePageAutoTranslation({
			...baseParams,
			dependencies: mockDependencies,
		});

		// 英語から他の3言語への翻訳が試みられたことを確認
		expect(mockFetchTranslateAPI).toHaveBeenCalledTimes(3); // ja, zh, ko
		expect(mockFetchTranslateAPI).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ targetLocale: "ja" }),
		);
		expect(mockFetchTranslateAPI).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ targetLocale: "zh" }),
		);
		expect(mockFetchTranslateAPI).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ targetLocale: "ko" }),
		);

		// 各翻訳の間に遅延が挿入されたことを確認
		expect(mockDelay).toHaveBeenCalledTimes(3);
	});
});
