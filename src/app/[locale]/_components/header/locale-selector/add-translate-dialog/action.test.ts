import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import {
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
} from "@/app/[locale]/_db/page-detail-queries.server";
import { fetchPageIdBySlug } from "@/app/[locale]/_db/page-utility-queries.server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { translateAction } from "./action";

vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));
vi.mock("@/app/_db/queries.server", () => ({
	fetchGeminiApiKeyByHandle: vi.fn(),
}));
vi.mock("@/app/[locale]/_db/mutations.server");
vi.mock("@/app/[locale]/_db/page-detail-queries.server");
vi.mock("@/app/[locale]/_db/page-utility-queries.server");

vi.mock("next/cache");

describe("TranslateAction", () => {
	const mockGeminiApiKey = {
		apiKey: "test-api-key",
	};

	beforeEach(async () => {
		await prisma.user.deleteMany();
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
		formData.append("pageSlug", "mockUserId1-page1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("targetContentType", "pageComment");

		await expect(translateAction({ success: false }, formData)).rejects.toThrow(
			"NEXT_REDIRECT",
		);
	});

	it("should validate input data", async () => {
		const formData = new FormData();

		const result = await translateAction({ success: false }, formData);

		expect(result.success).toBe(false);
	});

	it("should handle page translation successfully", async () => {
		const mockPage = {
			id: 1,
			title: "Test Page",
			slug: "test-page",
			pageSegments: [{ number: 1, text: "Segment 1" }],
		};
		vi.mocked(fetchPageIdBySlug).mockResolvedValue(mockPage);
		(
			fetchPageWithPageSegments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockPage);
		(
			createTranslationJob as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });
		(
			fetchPageWithTitleAndComments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 1,
			title: "Test Page",
			pageComments: [],
		});
		const formData = new FormData();
		formData.append("pageSlug", "test-page");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("targetContentType", "page");

		const result = await translateAction({ success: false }, formData);
		console.log("result", result);
		expect(result).toMatchObject({ success: true });
		expect(revalidatePath).toHaveBeenCalled();
	});

	it("should handle page not found for translation", async () => {
		(
			fetchPageIdBySlug as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageSlug", "mockUserId1-page1");
		formData.append("aiModel", "gemini-pro");
		formData.append("targetLocale", "en");
		formData.append("targetContentType", "page");

		const result = await translateAction({ success: false }, formData);

		expect(result).toEqual({ success: false, message: "Page not found" });
	});
});
