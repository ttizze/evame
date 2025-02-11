import { fetchGeminiApiKeyByHandle } from "@/app/db/queries.server";
import { getCurrentUser } from "@/auth";
import { getTranslateUserQueue } from "@/features/translate/translate-user-queue";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TranslateTarget } from "../../../(common-layout)/user/[handle]/page/[slug]/constants";
import { createUserAITranslationInfo } from "../../../(common-layout)/user/[handle]/page/[slug]/db/mutations.server";
import {
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
} from "../../../(common-layout)/user/[handle]/page/[slug]/db/queries.server";
import { TranslateAction } from "./action";
vi.mock("@/auth", () => ({
	getCurrentUser: vi.fn(),
}));
vi.mock("@/app/db/queries.server");
vi.mock(
	"../../../(common-layout)/user/[handle]/page/[slug]/db/mutations.server",
);
vi.mock("../../../(common-layout)/user/[handle]/page/[slug]/db/queries.server");
vi.mock("@/features/translate/translate-user-queue");
vi.mock("next/cache");

describe("TranslateAction", () => {
	const mockUser = {
		id: 1,
		handle: "testuser",
	};

	const mockGeminiApiKey = {
		apiKey: "test-api-key",
	};

	const mockQueue = {
		add: vi.fn(),
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
		(
			getTranslateUserQueue as unknown as ReturnType<typeof vi.fn>
		).mockReturnValue(mockQueue);
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

		const result = await TranslateAction({ success: false }, new FormData());

		expect(result.success).toBe(false);
	});

	it("should validate input data", async () => {
		const formData = new FormData();

		const result = await TranslateAction({ success: false }, formData);

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
		//@ts-ignore
		(
			fetchPageWithTitleAndComments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(mockPage);
		(
			createUserAITranslationInfo as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue({ id: 1 });

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("locale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_COMMENT);

		const result = await TranslateAction({ success: false }, formData);

		expect(result).toEqual({ success: true });
		expect(mockQueue.add).toHaveBeenCalled();
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

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("locale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_PAGE);

		const result = await TranslateAction({ success: false }, formData);

		expect(result).toEqual({ success: true });
		expect(mockQueue.add).toHaveBeenCalled();
		expect(revalidatePath).toHaveBeenCalled();
	});

	it("should handle missing Gemini API key", async () => {
		(
			fetchGeminiApiKeyByHandle as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("locale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_PAGE);

		const result = await TranslateAction({ success: false }, formData);

		expect(result).toEqual({
			success: false,
			error: "Gemini API key not found",
		});
	});

	it("should handle page not found for comment translation", async () => {
		(
			fetchPageWithTitleAndComments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("locale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_COMMENT);

		const result = await TranslateAction({ success: false }, formData);

		expect(result).toEqual({ success: false, error: "Page not found" });
	});

	it("should handle page not found for page translation", async () => {
		(
			fetchPageWithPageSegments as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("aiModel", "gemini-pro");
		formData.append("locale", "en");
		formData.append("translateTarget", TranslateTarget.TRANSLATE_PAGE);

		const result = await TranslateAction({ success: false }, formData);

		expect(result).toEqual({ success: false, error: "Page not found" });
	});
});
