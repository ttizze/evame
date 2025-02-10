import { fetchGeminiApiKeyByHandle } from "@/app/db/queries.server";
import { getCurrentUser } from "@/auth";
import { getTranslateUserQueue } from "@/features/translate/translate-user-queue";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TranslateTarget } from "../../(common-layout)/user/[handle]/page/[slug]/constants";
import { createUserAITranslationInfo } from "../../(common-layout)/user/[handle]/page/[slug]/db/mutations.server";
import {
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
} from "../../(common-layout)/user/[handle]/page/[slug]/db/queries.server";
import { TranslateAction } from "./action";

vi.mock("@/auth", () => ({
	getCurrentUser: vi.fn(),
}));
vi.mock("@/app/db/queries.server");
vi.mock("../../db/queries.server");
vi.mock("../../db/mutations.server");
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

	beforeEach(() => {
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

	it("should return unauthorized error if no user", async () => {
		(getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);

		const result = await TranslateAction({}, new FormData());

		expect(result).toEqual({ generalError: "Unauthorized" });
	});

	it("should validate input data", async () => {
		const formData = new FormData();

		const result = await TranslateAction({}, formData);

		expect(result.fieldErrors).toBeDefined();
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

		const result = await TranslateAction({}, formData);

		expect(result).toEqual({ success: "Translation started" });
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

		const result = await TranslateAction({}, formData);

		expect(result).toEqual({ success: "Translation started" });
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

		await expect(TranslateAction({}, formData)).rejects.toThrow();
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

		const result = await TranslateAction({}, formData);

		expect(result).toEqual({ generalError: "Page not found" });
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

		const result = await TranslateAction({}, formData);

		expect(result).toEqual({ generalError: "Page not found" });
	});
});
