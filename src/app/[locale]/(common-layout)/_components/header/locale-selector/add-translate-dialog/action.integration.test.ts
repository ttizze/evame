import { ContentKind } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueTranslate } from "@/app/[locale]/_infrastructure/qstash/enqueue-translate.server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPageWithAnnotations,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { translateAction } from "./action";

await setupDbPerFile(import.meta.url);

// 外部システムのみモック（キューシステム）
vi.mock(
	"@/app/[locale]/_infrastructure/qstash/enqueue-translate.server",
	() => ({
		enqueueTranslate: vi.fn(),
	}),
);

describe("translateAction", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.mocked(enqueueTranslate).mockResolvedValue({
			messageId: "test-id",
			url: "https://test.example.com",
		});
	});

	afterEach(async () => {
		await resetDatabase();
	});

	it("無効な入力データが渡された場合、バリデーションエラーを返す", async () => {
		// Arrange: 実際のユーザーを作成し、認証をモック（セッション管理は外部システム）
		const user = await createUser();
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const invalidFormData = new FormData();
		// aiModelとtargetLocaleが必須だが、空文字列を送信

		// Act
		const result = await translateAction({ success: false }, invalidFormData);

		// Assert: バリデーションエラーが返される
		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("認証されていないユーザーがアクセスした場合、リダイレクトされる", async () => {
		// Arrange: 認証されていない状態をモック
		vi.mocked(getCurrentUser).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageSlug", "test-page");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");

		// Act & Assert: リダイレクトエラーが発生する
		await expect(translateAction({ success: false }, formData)).rejects.toThrow(
			"NEXT_REDIRECT",
		);
	});

	it("存在しないページを翻訳しようとした場合、エラーメッセージを返す", async () => {
		// Arrange: 実際のユーザーを作成
		const user = await createUser();
		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", "non-existent-page");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");

		// Act
		const result = await translateAction({ success: false }, formData);

		// Assert: エラーメッセージが返される
		expect(result.success).toBe(false);
		expect(!result.success && result.message).toBe("Page not found");
	});

	it("有効な入力データでページを翻訳した場合、翻訳ジョブが作成され成功レスポンスが返る", async () => {
		// Arrange: 実際のユーザーとページを作成
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Test Page Title",
					textAndOccurrenceHash: "hash-title",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "First paragraph",
					textAndOccurrenceHash: "hash-1",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", page.slug);
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "ja");

		// Act
		const result = await translateAction({ success: false }, formData);

		// Assert: 成功レスポンスが返される
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.translationJobs).toHaveLength(1);
		}

		// Assert: 翻訳ジョブがデータベースに作成されている（実際のDBで検証）
		const translationJobs = await prisma.translationJob.findMany({
			where: { pageId: page.id },
		});
		expect(translationJobs).toHaveLength(1);
		expect(translationJobs[0]?.locale).toBe("ja");
		expect(translationJobs[0]?.aiModel).toBe("gemini-pro");

		// Assert: キューにジョブがエンキューされている（外部システムのモック）
		expect(enqueueTranslate).toHaveBeenCalledTimes(1);
	});

	it("ページにコメントがある場合、コメントも翻訳ジョブに含まれる", async () => {
		// Arrange: 実際のユーザーとページ、コメントを作成
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page-with-comments",
			segments: [
				{
					number: 0,
					text: "Test Page Title",
					textAndOccurrenceHash: "hash-title",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "First paragraph",
					textAndOccurrenceHash: "hash-1",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// コメントを作成
		const commentContent = await prisma.content.create({
			data: { kind: ContentKind.PAGE_COMMENT },
		});
		await prisma.segment.create({
			data: {
				contentId: commentContent.id,
				number: 1,
				text: "Comment text",
				textAndOccurrenceHash: "hash-comment-1",
				segmentTypeId: await (
					await import("@/tests/db-helpers")
				).getSegmentTypeId("PRIMARY"),
			},
		});
		await prisma.pageComment.create({
			data: {
				id: commentContent.id,
				pageId: page.id,
				userId: user.id,
				mdastJson: {},
				locale: "en",
			},
		});

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", page.slug);
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "ja");

		// Act
		const result = await translateAction({ success: false }, formData);

		// Assert: 成功レスポンスが返される
		expect(result.success).toBe(true);
		if (result.success) {
			// ページ本体 + コメント = 2つの翻訳ジョブ
			expect(result.data.translationJobs.length).toBeGreaterThanOrEqual(2);
		}

		// Assert: 複数の翻訳ジョブがデータベースに作成されている
		const translationJobs = await prisma.translationJob.findMany({
			where: { pageId: page.id },
		});
		expect(translationJobs.length).toBeGreaterThanOrEqual(2);

		// Assert: キューに複数のジョブがエンキューされている
		expect(enqueueTranslate).toHaveBeenCalledTimes(translationJobs.length);
	});

	it("ページに注釈がある場合、注釈も翻訳ジョブに含まれる", async () => {
		// Arrange: メインページと注釈を作成
		const user = await createUser();
		const { mainPage, annotationContent } = await createPageWithAnnotations({
			userId: user.id,
			mainPageSlug: "page-with-annotations",
			mainPageSegments: [
				{
					number: 0,
					text: "Page Title",
					textAndOccurrenceHash: "hash-title",
				},
				{
					number: 1,
					text: "Main text",
					textAndOccurrenceHash: "hash-main-1",
				},
			],
			annotationSegments: [
				{
					number: 0,
					text: "Annotation text",
					textAndOccurrenceHash: "hash-anno-0",
					linkedToMainSegmentNumber: 1,
				},
			],
		});

		vi.mocked(getCurrentUser).mockResolvedValue(toSessionUser(user));

		const formData = new FormData();
		formData.append("pageSlug", mainPage.slug);
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "ja");

		// Act
		const result = await translateAction({ success: false }, formData);

		// Assert
		expect(result.success).toBe(true);
		const translationJobs = await prisma.translationJob.findMany({
			where: { pageId: mainPage.id },
		});
		expect(translationJobs.length).toBeGreaterThanOrEqual(2);

		const annotationCall = vi
			.mocked(enqueueTranslate)
			.mock.calls.find(
				([body]) => body.annotationContentId === annotationContent.id,
			);
		expect(annotationCall?.[0]).toMatchObject({
			annotationContentId: annotationContent.id,
			pageId: mainPage.id,
			targetLocale: "ja",
		});
	});
});
