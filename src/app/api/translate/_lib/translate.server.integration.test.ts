import { TranslationProofStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { translateChunk } from "@/app/api/translate/_lib/translate.server";
import { prisma } from "@/lib/prisma";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createGeminiApiKey,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getGeminiModelResponse } from "../_services/gemini";

await setupDbPerFile(import.meta.url);

if (process.env.DEBUG_TEST_DB === "1") {
	const vitestEnvKeys = Object.keys(process.env)
		.filter((key) => key.startsWith("VITEST"))
		.sort();
	console.log(
		`[translate.server.integration.test] VITEST_FILE_PATH=${process.env.VITEST_FILE_PATH ?? "<undefined>"}`,
	);
	console.log(
		`[translate.server.integration.test] VITEST_* keys=${vitestEnvKeys.join(", ") || "<none>"}`,
	);
}

// 外部システムのみモック（Gemini API）
vi.mock("../_services/gemini", () => ({
	getGeminiModelResponse: vi.fn(),
}));

/**
 * 翻訳テスト用のセットアップ（ユーザー、ページ、セグメント、Gemini API Keyを作成）
 */
async function setupTranslationTest(data?: {
	segments?: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		segmentTypeKey: "PRIMARY" | "COMMENTARY";
	}>;
}) {
	const user = await createUser();
	const page = await createPageWithSegments({
		userId: user.id,
		slug: "test-page",
		segments: data?.segments ?? [
			{
				number: 0,
				text: "Hello",
				textAndOccurrenceHash: "hash0",
				segmentTypeKey: "PRIMARY",
			},
			{
				number: 1,
				text: "World",
				textAndOccurrenceHash: "hash1",
				segmentTypeKey: "PRIMARY",
			},
		],
	});
	await createGeminiApiKey({ userId: user.id });

	return { user, page };
}

describe("translateChunk", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	it("Geminiから正常レスポンスが返された場合、翻訳がデータベースに保存される", async () => {
		// Arrange: テスト用データを作成
		const { user, page } = await setupTranslationTest();

		// Gemini APIのモック（正常レスポンス）
		vi.mocked(getGeminiModelResponse).mockResolvedValue(`
      [
        {"number": 0, "text": "こんにちは"},
        {"number": 1, "text": "世界"}
      ]
    `);

		// Act
		await translateChunk(
			user.id,
			"gemini",
			"test-model",
			[
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
			"ja",
			page.id,
			"Test Page",
		);

		// Assert: 翻訳結果がデータベースに保存されている（実際のDBで検証）
		const translatedTexts = await prisma.segmentTranslation.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});

	it("Geminiが空レスポンスを返し続けた場合、リトライ後にエラーで失敗し翻訳が保存されない", async () => {
		// Arrange: テスト用データを作成
		const { user, page } = await setupTranslationTest({
			segments: [
				{
					number: 0,
					text: "test",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "failed",
					textAndOccurrenceHash: "hash1",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		// Gemini APIのモック（何度呼んでも空配列を返す）
		vi.mocked(getGeminiModelResponse).mockResolvedValue("[]");

		// Act & Assert: エラーが発生する
		await expect(
			translateChunk(
				user.id,
				"gemini",
				"test-model",
				[
					{ number: 0, text: "test" },
					{ number: 1, text: "failed" },
				],
				"ja",
				page.id,
				"Test Page",
			),
		).rejects.toThrow();

		// Assert: 失敗時は翻訳が保存されず、Proofも作られない（実際のDBで検証）
		const translatedTexts = await prisma.segmentTranslation.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBe(0);
		const proof = await prisma.pageLocaleTranslationProof.findUnique({
			where: { pageId_locale: { pageId: page.id, locale: "ja" } },
		});
		expect(proof).toBeNull();
	});

	it("1回目は空レスポンスで2回目で正常レスポンスが返された場合、リトライ後に翻訳が保存される", async () => {
		// Arrange: テスト用データを作成
		const { user, page } = await setupTranslationTest();

		// Gemini APIのモック（1回目: 空レスポンス, 2回目: 正常レスポンス）
		vi.mocked(getGeminiModelResponse)
			.mockResolvedValueOnce("[]")
			.mockResolvedValueOnce(`
        [
          {"number": 0, "text": "こんにちは"},
          {"number": 1, "text": "世界"}
        ]
      `);

		// Act
		await translateChunk(
			user.id,
			"gemini",
			"test-model",
			[
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
			"ja",
			page.id,
			"Test Page",
		);

		// Assert: 翻訳結果がデータベースに保存されている（実際のDBで検証）
		const translatedTexts = await prisma.segmentTranslation.findMany({
			where: { locale: "ja" },
		});
		expect(translatedTexts.length).toBeGreaterThanOrEqual(2);
		expect(translatedTexts.some((t) => t.text === "こんにちは")).toBe(true);
		expect(translatedTexts.some((t) => t.text === "世界")).toBe(true);
	});

	it("PageLocaleTranslationProofが存在しない場合、新規レコードがMACHINE_DRAFTステータスで作成される", async () => {
		// Arrange: テスト用データを作成
		const { user, page } = await setupTranslationTest();

		// Gemini APIのモック（正常レスポンス）
		vi.mocked(getGeminiModelResponse).mockResolvedValue(
			`[
				{"number": 0, "text": "こんにちは"},
				{"number": 1, "text": "世界"}
			]`,
		);

		// Act
		await translateChunk(
			user.id,
			"gemini",
			"test-model",
			[
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
			"ja",
			page.id,
			"Test Page",
		);

		// Assert: PageLocaleTranslationProofがMACHINE_DRAFTステータスで作成されている（実際のDBで検証）
		const proof = await prisma.pageLocaleTranslationProof.findUnique({
			where: { pageId_locale: { pageId: page.id, locale: "ja" } },
		});

		expect(proof).not.toBeNull();
		expect(proof?.translationProofStatus).toBe(
			TranslationProofStatus.MACHINE_DRAFT,
		);
	});

	it("既存のPageLocaleTranslationProofがある場合、ステータスが変更されずに既存レコードが保持される", async () => {
		// Arrange: テスト用データを作成
		const { user, page } = await setupTranslationTest();

		// 事前にPROOFREADステータスでPageLocaleTranslationProofを作成
		const existingProof = await prisma.pageLocaleTranslationProof.create({
			data: {
				pageId: page.id,
				locale: "ja",
				translationProofStatus: TranslationProofStatus.PROOFREAD,
			},
		});

		// Gemini APIのモック（正常レスポンス）
		vi.mocked(getGeminiModelResponse).mockResolvedValue(
			`[
				{"number": 0, "text": "こんにちは"},
				{"number": 1, "text": "世界"}
			]`,
		);

		// Act
		await translateChunk(
			user.id,
			"gemini",
			"test-model",
			[
				{ number: 0, text: "Hello" },
				{ number: 1, text: "World" },
			],
			"ja",
			page.id,
			"Test Page",
		);

		// Assert: 既存のレコードが保持され、ステータスが変更されていない（実際のDBで検証）
		const updatedProof = await prisma.pageLocaleTranslationProof.findUnique({
			where: { pageId_locale: { pageId: page.id, locale: "ja" } },
		});

		expect(updatedProof).not.toBeNull();
		// idが変わっていないこと
		expect(updatedProof?.id).toBe(existingProof.id);
		// ステータスが変更されていないこと
		expect(updatedProof?.translationProofStatus).toBe(
			TranslationProofStatus.PROOFREAD,
		);
	});
});
