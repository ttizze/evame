import {
	createPageAITranslationInfo,
	createUserAITranslationInfo,
} from "@/app/[locale]/_db/mutations.server";
import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
} from "../../../(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import { TranslateTarget } from "../../../(common-layout)/user/[handle]/page/[slug]/constants";
import { translateAction } from "./action";
vi.mock("@/auth", () => ({
	getCurrentUser: vi.fn(),
}));
vi.mock("@/app/_db/queries.server", () => ({
	fetchGeminiApiKeyByHandle: vi.fn(),
}));
vi.mock("@/app/[locale]/_db/mutations.server");
vi.mock("@/app/[locale]/_db/queries.server");
vi.mock(
	"../../../(common-layout)/user/[handle]/page/[slug]/_db/queries.server",
);
vi.mock("next/cache");

describe("TranslateAction", () => {
	const mockGeminiApiKey = {
		apiKey: "test-api-key",
	};

	beforeEach(async () => {
		await prisma.user.deleteMany();
		await prisma.userAITranslationInfo.deleteMany();
		await prisma.page.deleteMany();
		await prisma.pageSegment.deleteMany();
		await prisma.pageComment.deleteMany();
		await prisma.pageCommentSegment.deleteMany();
		vi.clearAllMocks();
		(getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 1,
			handle: "testuser",
		});
		(
			fetchGeminiApiKeyByHandle as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockGeminiApiKey);
		vi.spyOn(global, "fetch").mockResolvedValue({
			json: async () => ({}),
			ok: true,
		} as Response);
		(revalidatePath as unknown as ReturnType<typeof vi.fn>).mockImplementation(
			() => {},
		);
	});
	afterEach(async () => {
		await prisma.user.deleteMany();
		await prisma.userAITranslationInfo.deleteMany();
		await prisma.page.deleteMany();
		await prisma.pageSegment.deleteMany();
		await prisma.pageComment.deleteMany();
		await prisma.pageCommentSegment.deleteMany();
	});
	it("should return unauthorized error if no user", async () => {
		(getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_COMMENT);

		await expect(translateAction({ success: false }, formData)).rejects.toThrow(
			"NEXT_REDIRECT",
		);
	});

	it("should validate input data", async () => {
		const formData = new FormData();

		const result = await translateAction({ success: false }, formData);

		expect(result.success).toBe(false);
	});

	it("should handle comment translation successfully", async () => {
		const mockPage = {
			id: 1,
			slug: "test-page",
			pageSegments: [{ number: 0, text: "Title" }],
			pageComments: [
				{
					id: 1,
					pageCommentSegments: [{ number: 1, text: "Comment text" }],
				},
			],
		};
		(
			fetchPageWithTitleAndComments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockPage);
		(
			createUserAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });
		(
			createPageAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_COMMENT);

		const result = await translateAction({ success: false }, formData);

		expect(result).toEqual({ success: true });
		expect(global.fetch).toHaveBeenCalled();
	});

	it("should handle page translation successfully", async () => {
		const mockPage = {
			id: 1,
			title: "Test Page",
			slug: "test-page",
			pageSegments: [{ number: 1, text: "Segment 1" }],
		};

		(
			fetchPageWithPageSegments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockPage);
		(
			createUserAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });
		(
			createPageAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_PAGE);

		const result = await translateAction({ success: false }, formData);

		expect(result).toEqual({ success: true });
		expect(revalidatePath).toHaveBeenCalled();
	});

	it("should handle missing Gemini API key", async () => {
		(
			fetchGeminiApiKeyByHandle as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_PAGE);

		const result = await translateAction({ success: false }, formData);

		expect(result).toEqual({
			success: false,
			message: "Gemini API key not found",
		});
	});

	it("should handle page not found for comment translation", async () => {
		(
			fetchPageWithTitleAndComments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_COMMENT);

		const result = await translateAction({ success: false }, formData);

		expect(result).toEqual({ success: false, message: "Page not found" });
	});

	it("should handle page not found for page translation", async () => {
		(
			fetchPageWithPageSegments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_PAGE);

		const result = await translateAction({ success: false }, formData);

		expect(result).toEqual({ success: false, message: "Page not found" });
	});
});
