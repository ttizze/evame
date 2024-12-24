// 以下は「translate」関数に対する単体テストコード例である。
// 前回の例に加え、Geminiサービスをモックしている点は同様だが、
// Gemini側が途中で失敗した場合（空レスポンス等で翻訳ができない）のテストケースを追加している。
// Prismaは実際にはテスト用DB等が必要だが、この例ではあくまで構成例である。

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { prisma } from "~/utils/prisma";
import { translate } from "../lib/translate.server"; // テスト対象となるtranslate関数
import { getGeminiModelResponse } from "../services/gemini";
import type { TranslateJobParams } from "../types";

// geminiのみモック
vi.mock("../services/gemini", () => ({
	getGeminiModelResponse: vi.fn(),
}));

describe("translate関数テスト (geminiのみモック)", () => {
	let userId: number;
	let pageId: number;
	let userAITranslationInfoId: number;

	beforeEach(async () => {
		// テスト用ユーザー・ページ・翻訳ジョブ情報を作成
		const user = await prisma.user.create({
			data: {
				userName: "testuser",
				email: "testuser@example.com",
				displayName: "testuser",
				icon: "testuser",
			},
		});
		userId = user.id;

		const page = await prisma.page.create({
			data: {
				slug: "test-page",
				userId: user.id,
				content: "dummy-content",
			},
		});
		pageId = page.id;
		await prisma.sourceText.createMany({
			data: [
				{ pageId, number: 0, text: "Hello", textAndOccurrenceHash: "hash0" },
				{ pageId, number: 1, text: "World", textAndOccurrenceHash: "hash1" },
			],
		});
		const userAITranslationInfo = await prisma.userAITranslationInfo.create({
			data: {
				userId: user.id,
				pageId: page.id,
				locale: "ja",
				aiModel: "test-model",
			},
		});
		userAITranslationInfoId = userAITranslationInfo.id;
	});


	test("正常ケース：Geminiモックレスポンスを与えて結果が成功するか", async () => {
		const params: TranslateJobParams = {
			userAITranslationInfoId,
			geminiApiKey: "dummy-key",
			aiModel: "test-model",
			userId,
			numberedContent: "dummy-content",
			locale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
		};

		// 正常な翻訳レスポンスを返す
		vi.mocked(getGeminiModelResponse).mockResolvedValue(`
      [
        {"number":0,"text":"こんにちは"},
        {"number":1,"text":"世界"}
      ]
    `);

		await expect(translate(params)).resolves.toBeUndefined();

		const updatedInfo = await prisma.userAITranslationInfo.findUnique({
			where: { id: userAITranslationInfoId },
		});

		// 翻訳ステータスがcompletedになっているか
		expect(updatedInfo?.aiTranslationStatus).toBe("completed");

		// 翻訳結果がDBに保存されているか確認
		const translatedTexts = await prisma.translateText.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});

	test("失敗ケース：geminiが常に空レスポンスで翻訳抽出不可となり、最終的にfailedになる", async () => {
		const params: TranslateJobParams = {
			userAITranslationInfoId,
			geminiApiKey: "dummy-key",
			aiModel: "test-model",
			userId,
			numberedContent: "dummy-content",
			locale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
		};

		// 何度呼ばれても空のレスポンスを返す（抽出不可）
		vi.mocked(getGeminiModelResponse).mockResolvedValue("[]");

		await expect(translate(params)).resolves.toBeUndefined();

		const updatedInfo = await prisma.userAITranslationInfo.findUnique({
			where: { id: userAITranslationInfoId },
		});

		// リトライ上限後failedになっているか
		expect(updatedInfo?.aiTranslationStatus).toBe("failed");

		// 翻訳結果が1つも無いことを確認
		const translatedTexts = await prisma.translateText.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBe(0);
	});

	test("部分的失敗ケース：最初の呼び出しで空レスポンス、その後2回目で成功する", async () => {
		const params: TranslateJobParams = {
			userAITranslationInfoId,
			geminiApiKey: "dummy-key",
			aiModel: "test-model",
			userId,
			numberedContent: "dummy-content",
			locale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
		};

		vi.mocked(getGeminiModelResponse)
			.mockResolvedValueOnce("[]") // 1回目空レスポンス
			.mockResolvedValueOnce(`
        [
          {"number":0,"text":"こんにちは"},
          {"number":1,"text":"世界"}
        ]
      `); // 2回目正常レスポンス

		await expect(translate(params)).resolves.toBeUndefined();

		const updatedInfo = await prisma.userAITranslationInfo.findUnique({
			where: { id: userAITranslationInfoId },
		});

		// 成功パターンなのでcompletedになっていること
		expect(updatedInfo?.aiTranslationStatus).toBe("completed");

		// 翻訳結果確認
		const translatedTexts = await prisma.translateText.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});
});
