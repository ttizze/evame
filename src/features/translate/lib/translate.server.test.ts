// translate.server.test.ts

import { beforeEach, describe, expect, test, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getGeminiModelResponse } from "../services/gemini";
import { translate } from "./translate.server";

vi.mock("../services/gemini", () => ({
	getGeminiModelResponse: vi.fn(),
}));

// 型定義
import type { TranslateJobParams } from "../types";

describe("translate関数の単体テスト (Gemini呼び出しのみモック)", () => {
	let userId: string;
	let pageId: number;
	let translationJobId: number;
	beforeEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		await prisma.pageSegment.deleteMany();
		await prisma.translationJob.deleteMany();
		// テスト用ユーザー
		const user = await prisma.user.create({
			data: {
				handle: "testuser",
				name: "testuser",
				image: "testuser",
				email: "testuser@example.com",
			},
		});
		userId = user.id;

		// テスト用ページ
		const page = await prisma.page.create({
			data: {
				slug: "test-page",
				userId: user.id,
				mdastJson: {
					type: "doc",
					content: [
						{ type: "paragraph", content: [{ type: "text", text: "Hello" }] },
					],
				},
			},
		});
		pageId = page.id;

		// ページセグメント（翻訳対象）
		await prisma.pageSegment.createMany({
			data: [
				{ pageId, number: 0, text: "Hello", textAndOccurrenceHash: "hash0" },
				{ pageId, number: 1, text: "World", textAndOccurrenceHash: "hash1" },
			],
		});

		// ユーザー翻訳情報
		const translationJob = await prisma.translationJob.create({
			data: {
				userId: user.id,
				pageId: page.id,
				locale: "ja",
				aiModel: "test-model",
			},
		});
		translationJobId = translationJob.id;
	});
	afterEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		await prisma.pageSegment.deleteMany();
		await prisma.translationJob.deleteMany();
	});

	test("正常ケース：Geminiから正常レスポンスが返った場合、最終的にステータスがcompletedとなり翻訳がDBに保存される", async () => {
		const params: TranslateJobParams = {
			translationJobId,
			geminiApiKey: "dummy-key",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
			targetContentType: "page",
		};

		// モックの戻り値（正常レスポンス）
		vi.mocked(getGeminiModelResponse).mockResolvedValue(`
      [
        {"number": 0, "text": "こんにちは"},
        {"number": 1, "text": "世界"}
      ]
    `);

		// 依存注入：commonDeps, pageDeps, commentDeps とパラメータを渡す
		await expect(translate(params)).resolves.toBeUndefined();

		// 最終的に completed となっているはず
		const updatedInfo = await prisma.translationJob.findUnique({
			where: { id: translationJobId },
		});
		expect(updatedInfo?.status).toBe("COMPLETED");

		// 翻訳結果が保存されているか
		const translatedTexts = await prisma.pageSegmentTranslation.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});

	test("失敗ケース：Geminiが空レスポンス([])しか返さず翻訳抽出不可→リトライ上限に達してfailedになる", async () => {
		const params: TranslateJobParams = {
			translationJobId,
			geminiApiKey: "dummy-key",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "test" },
				{ number: 1, text: "failed" },
			],
			targetContentType: "page",
		};

		// 何度呼んでも空配列を返す
		vi.mocked(getGeminiModelResponse).mockResolvedValue("[]");

		await expect(translate(params)).resolves.toBeUndefined();

		const updatedInfo = await prisma.translationJob.findUnique({
			where: { id: translationJobId },
		});
		// リトライ上限に達してfailedになったか
		expect(updatedInfo?.status).toBe("FAILED");
	});

	test("部分的失敗ケース：1回目は空レスポンス→2回目で正常レスポンス", async () => {
		const params: TranslateJobParams = {
			translationJobId,
			geminiApiKey: "dummy-key",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
			targetContentType: "page",
		};

		// 1回目: 空レスポンス, 2回目: 正常レスポンス
		vi.mocked(getGeminiModelResponse)
			.mockResolvedValueOnce("[]")
			.mockResolvedValueOnce(`
        [
          {"number": 0, "text": "こんにちは"},
          {"number": 1, "text": "世界"}
        ]
      `);

		await expect(translate(params)).resolves.toBeUndefined();

		const updatedInfo = await prisma.translationJob.findUnique({
			where: { id: translationJobId },
		});
		// 結局成功→completed となるはず
		expect(updatedInfo?.status).toBe("COMPLETED");

		// 翻訳結果
		const translatedTexts = await prisma.pageSegmentTranslation.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});
});
