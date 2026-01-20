import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createGeminiApiKey,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getGeminiModelResponse } from "./_infra/gemini";
import { POST } from "./route";

await setupDbPerFile(import.meta.url);

// 外部システムのみモック
vi.mock("./_infra/gemini", () => ({
	getGeminiModelResponse: vi.fn(),
}));

vi.mock("../_utils/with-qstash-signature", () => ({
	withQstashVerification: (handler: (req: NextRequest) => Promise<Response>) =>
		handler,
}));

describe("POST /api/translate/chunk", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("翻訳が成功した場合、progressが100になる", async () => {
		// Arrange
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY" as const,
				},
			],
		});
		await createGeminiApiKey({ userId: user.id });

		const segments = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.orderBy("number", "asc")
			.execute();

		const translationJob = await db
			.insertInto("translationJobs")
			.values({
				userId: user.id,
				pageId: page.id,
				locale: "ja",
				aiModel: "gemini-2.0-flash",
				status: "IN_PROGRESS",
				progress: 0,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		vi.mocked(getGeminiModelResponse).mockResolvedValue(`
      [
        {"number": 0, "text": "こんにちは"}
      ]
    `);

		const params = {
			translationJobId: translationJob.id,
			userId: user.id,
			aiModel: "gemini-2.0-flash",
			pageId: page.id,
			targetLocale: "ja",
			segments: segments.map((s) => ({
				id: s.id,
				number: s.number,
				text: s.text,
			})),
			title: "Test Page",
			totalChunks: 1,
			chunkIndex: 0,
			pageCommentId: null,
			annotationContentId: null,
		};

		// Act
		const req = new NextRequest("http://localhost/api/translate/chunk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		const response = await POST(req);
		const data = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(data).toEqual({ ok: true });

		// DBでprogressが更新されていることを確認
		const updatedJob = await db
			.selectFrom("translationJobs")
			.selectAll()
			.where("id", "=", translationJob.id)
			.executeTakeFirstOrThrow();
		expect(updatedJob.status).toBe("COMPLETED");
		expect(updatedJob.progress).toBe(100);

		// 翻訳が保存されていることを確認
		const translations = await db
			.selectFrom("segmentTranslations")
			.selectAll()
			.where("locale", "=", "ja")
			.execute();
		expect(translations.length).toBeGreaterThan(0);
	});

	it("翻訳が失敗した場合、エラーメッセージがDBに保存され500を返す", async () => {
		// Arrange
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY" as const,
				},
			],
		});
		await createGeminiApiKey({ userId: user.id });

		const segments = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.orderBy("number", "asc")
			.execute();

		const translationJob = await db
			.insertInto("translationJobs")
			.values({
				userId: user.id,
				pageId: page.id,
				locale: "ja",
				aiModel: "gemini-2.0-flash",
				status: "IN_PROGRESS",
				progress: 0,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// 429エラーをシミュレート（statusプロパティ付き）
		const rateLimitError = new Error("Rate limit exceeded") as Error & {
			status?: number;
		};
		rateLimitError.status = 429;
		vi.mocked(getGeminiModelResponse).mockRejectedValue(rateLimitError);

		const params = {
			translationJobId: translationJob.id,
			userId: user.id,
			aiModel: "gemini-2.0-flash",
			pageId: page.id,
			targetLocale: "ja",
			segments: segments.map((s) => ({
				id: s.id,
				number: s.number,
				text: s.text,
			})),
			title: "Test Page",
			totalChunks: 1,
			chunkIndex: 0,
			pageCommentId: null,
			annotationContentId: null,
		};

		// Act
		const req = new NextRequest("http://localhost/api/translate/chunk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		const response = await POST(req);
		const data = await response.json();

		// Assert
		expect(response.status).toBe(500);
		expect(data).toEqual({ ok: false });

		// DBでエラーが保存されていることを確認（フォーマットされたメッセージ）
		const failedJob = await db
			.selectFrom("translationJobs")
			.selectAll()
			.where("id", "=", translationJob.id)
			.executeTakeFirstOrThrow();
		expect(failedJob.status).toBe("FAILED");
		expect(failedJob.error).toBe(
			"API rate limit exceeded. Please wait and try again later.",
		);
	});

	it("リクエストボディが不正なJSONの場合、500を返す", async () => {
		// Arrange
		const invalidJson = "{ invalid json }";

		// Act
		const req = new NextRequest("http://localhost/api/translate/chunk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: invalidJson,
		});

		const response = await POST(req);
		const data = await response.json();

		// Assert
		expect(response.status).toBe(500);
		expect(data).toEqual({ ok: false });
	});

	it("翻訳が成功しprogressが100未満の場合、IN_PROGRESSのままになる", async () => {
		// Arrange
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY" as const,
				},
			],
		});
		await createGeminiApiKey({ userId: user.id });

		const segments = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.orderBy("number", "asc")
			.execute();

		const translationJob = await db
			.insertInto("translationJobs")
			.values({
				userId: user.id,
				pageId: page.id,
				locale: "ja",
				aiModel: "gemini-2.0-flash",
				status: "IN_PROGRESS",
				progress: 0,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		vi.mocked(getGeminiModelResponse).mockResolvedValue(`
      [
        {"number": 0, "text": "こんにちは"}
      ]
    `);

		const params = {
			translationJobId: translationJob.id,
			userId: user.id,
			aiModel: "gemini-2.0-flash",
			pageId: page.id,
			targetLocale: "ja",
			segments: segments.map((s) => ({
				id: s.id,
				number: s.number,
				text: s.text,
			})),
			title: "Test Page",
			totalChunks: 2,
			chunkIndex: 0,
			pageCommentId: null,
			annotationContentId: null,
		};

		// Act
		const req = new NextRequest("http://localhost/api/translate/chunk", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		const response = await POST(req);
		const data = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(data).toEqual({ ok: true });

		// DBでprogressが更新されているが100未満であることを確認
		const updatedJob = await db
			.selectFrom("translationJobs")
			.selectAll()
			.where("id", "=", translationJob.id)
			.executeTakeFirstOrThrow();
		expect(updatedJob.status).toBe("IN_PROGRESS");
		expect(updatedJob.progress).toBeLessThan(100);
	});
});
