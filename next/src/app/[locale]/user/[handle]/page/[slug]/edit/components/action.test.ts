import { getLocaleFromHtml } from "@/app/[locale]/lib/get-locale-from-html";
import { getCurrentUser } from "@/auth";
import { mockPages, mockUsers } from "@/tests/mock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handlePageTranslation } from "../lib/handle-page-translation";
import { processPageHtml } from "../lib/process-page-html";
import { editPageContentAction } from "./action";
// Mocks
vi.mock("@/auth");
vi.mock("@/app/[locale]/lib/get-locale-from-html");
vi.mock("../lib/process-page-html");
vi.mock("../lib/handle-page-translation");
vi.mock("next/cache");
vi.mock("next/navigation");

describe("editPageContentAction", () => {
	const mockFormData = new FormData();
	mockFormData.append("slug", "mockUserId1-page1");
	mockFormData.append("title", "Test Title");
	mockFormData.append("pageContent", "<p>Test content</p>");

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.GEMINI_API_KEY = "test-key";
	});

	it("should redirect if user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);

		await editPageContentAction({ success: false }, mockFormData);

		expect(redirect).toHaveBeenCalledWith("/auth/login");
	});

	it("should return validation error for invalid form data", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);

		const invalidFormData = new FormData();
		invalidFormData.append("slug", "");

		const result = await editPageContentAction(
			{ success: false },
			invalidFormData,
		);

		expect(result.success).toBe(false);
		expect(result.zodErrors).toBeDefined();
	});

	it("should successfully update public page and trigger translation", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getLocaleFromHtml).mockResolvedValue("en");
		vi.mocked(processPageHtml).mockResolvedValue(mockPages[0]);
		vi.mocked(handlePageTranslation).mockResolvedValue();

		const result = await editPageContentAction(
			{ success: false },
			mockFormData,
		);

		expect(result.success).toBe(true);
		expect(result.message).toBe("Page updated successfully");
		expect(handlePageTranslation).toHaveBeenCalled();
		expect(revalidatePath).toHaveBeenCalledWith(
			"/user/mockUserId1/page/mockUserId1-page1/edit",
		);
	});

	it("should handle missing GEMINI_API_KEY for public pages", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getLocaleFromHtml).mockResolvedValue("en");
		vi.mocked(processPageHtml).mockResolvedValue(mockPages[0]);

		// biome-ignore lint/performance/noDelete: <explanation>
		delete process.env.GEMINI_API_KEY;

		const result = await editPageContentAction(
			{ success: false },
			mockFormData,
		);

		expect(result.success).toBe(true);
		expect(result.message).toBe(
			"Gemini API key is not set. Page will not be translated.",
		);
	});

	it("should skip translation for non-public pages", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getLocaleFromHtml).mockResolvedValue("en");
		vi.mocked(processPageHtml).mockResolvedValue(mockPages[2]);

		const result = await editPageContentAction(
			{ success: false },
			mockFormData,
		);

		expect(result.success).toBe(true);
		expect(handlePageTranslation).not.toHaveBeenCalled();
	});
});
