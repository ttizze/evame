// translate.server.test.ts

import { TranslationProofStatus } from "@prisma/client";
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
		await prisma.segment.deleteMany();
		await prisma.translationJob.deleteMany();
		await prisma.pageLocaleTranslationProof.deleteMany();
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

		// テスト用コンテンツ
		const content = await prisma.content.create({
			data: {
				kind: "PAGE",
			},
		});

		// テスト用ページ
		const page = await prisma.page.create({
			data: {
				slug: "test-page",
				userId: user.id,
				id: content.id,
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
		await prisma.segment.createMany({
			data: [
				{
					contentId: content.id,
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
				},
				{
					contentId: content.id,
					number: 1,
					text: "World",
					textAndOccurrenceHash: "hash1",
				},
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

		// Gemini API Key を追加（translate で Gemini を使用する際に必須）
		await prisma.geminiApiKey.create({
			data: {
				userId: user.id,
				apiKey: "dummy-api-key",
			},
		});
	});
	afterEach(async () => {
		await prisma.geminiApiKey.deleteMany();
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		await prisma.content.deleteMany();
		await prisma.segment.deleteMany();
		await prisma.translationJob.deleteMany();
		await prisma.pageLocaleTranslationProof.deleteMany();
	});

	test("正常ケース：Geminiから正常レスポンスが返った場合、最終的にステータスがcompletedとなり翻訳がDBに保存される", async () => {
		const params: TranslateJobParams = {
			translationJobId,
			provider: "gemini",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
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
		const translatedTexts = await prisma.segmentTranslation.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});

	test("失敗ケース：Geminiが空レスポンス([])しか返さず翻訳抽出不可→リトライ上限に達してfailedになる", async () => {
		const params: TranslateJobParams = {
			translationJobId,
			provider: "gemini",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "test" },
				{ number: 1, text: "failed" },
			],
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
			provider: "gemini",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
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
		const translatedTexts = await prisma.segmentTranslation.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});

	test("正常ケース：PageLocaleTranslationProofが存在しない場合、新規レコードが作成される", async () => {
		const params: TranslateJobParams = {
			translationJobId,
			provider: "gemini",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
		};

		vi.mocked(getGeminiModelResponse).mockResolvedValue(
			`[
				{"number": 0, "text": "こんにちは"},
				{"number": 1, "text": "世界"}
			]`,
		);

		await expect(translate(params)).resolves.toBeUndefined();

		const proof = await prisma.pageLocaleTranslationProof.findUnique({
			where: { pageId_locale: { pageId, locale: "ja" } },
		});

		expect(proof).not.toBeNull();
		expect(proof?.translationProofStatus).toBe(
			TranslationProofStatus.MACHINE_DRAFT,
		);
	});

	test("既存のPageLocaleTranslationProofがある場合、translationProofStatusが変更されない", async () => {
		// 事前に PROOFREAD ステータスで作成
		const existingProof = await prisma.pageLocaleTranslationProof.create({
			data: {
				pageId,
				locale: "ja",
				translationProofStatus: TranslationProofStatus.PROOFREAD,
			},
		});

		const params: TranslateJobParams = {
			translationJobId,
			provider: "gemini",
			aiModel: "test-model",
			userId,
			targetLocale: "ja",
			pageId,
			title: "Test Page",
			numberedElements: [
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
		};

		vi.mocked(getGeminiModelResponse).mockResolvedValue(
			`[
				{"number": 0, "text": "こんにちは"},
				{"number": 1, "text": "世界"}
			]`,
		);

		await expect(translate(params)).resolves.toBeUndefined();

		const updatedProof = await prisma.pageLocaleTranslationProof.findUnique({
			where: { pageId_locale: { pageId, locale: "ja" } },
		});

		expect(updatedProof).not.toBeNull();
		// id が変わっていないこと
		expect(updatedProof?.id).toBe(existingProof.id);
		// ステータスが変更されていないこと
		expect(updatedProof?.translationProofStatus).toBe(
			TranslationProofStatus.PROOFREAD,
		);
	});
});
