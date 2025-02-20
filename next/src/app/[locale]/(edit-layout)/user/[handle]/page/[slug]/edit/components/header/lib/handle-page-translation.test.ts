import { createUserAITranslationInfo } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/db/mutations.server";
import { fetchPageWithPageSegments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/db/queries.server";
import { prisma } from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasExistingTranslation } from "../db/queries.server";

import { handlePageTranslation } from "./handle-page-translation";
// Mock all dependencies
vi.mock("../db/queries.server");
vi.mock(
	"@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/db/mutations.server",
);
vi.mock(
	"@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/db/queries.server",
);

describe("handlePageTranslation", () => {
	const mockParams = {
		currentUserId: "user123",
		pageId: 1,
		sourceLocale: "en",
		geminiApiKey: "test-api-key",
		title: "Test Title",
	};

	beforeEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		await prisma.pageSegment.deleteMany();
		await prisma.userAITranslationInfo.deleteMany();
		vi.spyOn(global, "fetch").mockResolvedValue({
			json: async () => ({}),
			ok: true,
		} as Response);
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await prisma.user.deleteMany();
		await prisma.page.deleteMany();
		await prisma.pageSegment.deleteMany();
		await prisma.userAITranslationInfo.deleteMany();
	});

	it("should not proceed if translation already exists", async () => {
		(
			hasExistingTranslation as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(true);

		await handlePageTranslation(mockParams);

		expect(hasExistingTranslation).toHaveBeenCalledWith(
			mockParams.pageId,
			"ja",
		);
		expect(createUserAITranslationInfo).not.toHaveBeenCalled();
		expect(fetchPageWithPageSegments).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("should process translation from English to Japanese", async () => {
		const mockTranslationInfo = { id: 123 };
		const mockPageData = {
			pageSegments: [
				{ number: 1, text: "Hello" },
				{ number: 2, text: "World" },
			],
		};

		(
			hasExistingTranslation as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(false);
		(
			createUserAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockTranslationInfo);
		(
			fetchPageWithPageSegments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockPageData);

		await handlePageTranslation(mockParams);

		expect(hasExistingTranslation).toHaveBeenCalledWith(
			mockParams.pageId,
			"ja",
		);
		expect(createUserAITranslationInfo).toHaveBeenCalledWith(
			mockParams.currentUserId,
			mockParams.pageId,
			"ja",
			"gemini-1.5-flash",
		);
		expect(fetchPageWithPageSegments).toHaveBeenCalledWith(mockParams.pageId);

		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(global.fetch).toHaveBeenCalledWith(
			"http://localhost:3000/api/translate",
			{
				method: "POST",
				body: JSON.stringify({
					userAITranslationInfoId: mockTranslationInfo.id,
					geminiApiKey: mockParams.geminiApiKey,
					aiModel: "gemini-1.5-flash",
					userId: mockParams.currentUserId,
					pageId: mockParams.pageId,
					targetLocale: "ja",
					numberedElements: [
						{ number: 1, text: "Hello" },
						{ number: 2, text: "World" },
					],
					translateTarget: "translatePage",
				}),
			},
		);
	});

	it("should process translation from Japanese to English", async () => {
		const mockParams = {
			currentUserId: "user123",
			pageId: 1,
			sourceLocale: "ja",
			geminiApiKey: "test-api-key",
			title: "テストタイトル",
		};

		const mockTranslationInfo = { id: 123 };
		const mockPageData = {
			pageSegments: [
				{ number: 1, text: "こんにちは" },
				{ number: 2, text: "世界" },
			],
		};

		(
			hasExistingTranslation as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(false);
		(
			createUserAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockTranslationInfo);
		(
			fetchPageWithPageSegments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockPageData);

		await handlePageTranslation(mockParams);

		expect(hasExistingTranslation).toHaveBeenCalledWith(
			mockParams.pageId,
			"en",
		);
		expect(createUserAITranslationInfo).toHaveBeenCalledWith(
			mockParams.currentUserId,
			mockParams.pageId,
			"en",
			"gemini-1.5-flash",
		);
	});

	it("should throw error if page segments not found", async () => {
		(
			hasExistingTranslation as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(false);
		(
			createUserAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: "translation123" });
		(
			fetchPageWithPageSegments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		await expect(handlePageTranslation(mockParams)).rejects.toThrow(
			"Page with page segments not found",
		);
	});
});
