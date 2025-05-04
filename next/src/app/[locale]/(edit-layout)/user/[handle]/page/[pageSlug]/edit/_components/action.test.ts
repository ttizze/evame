import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editPageContentAction } from "./action";
// Mocks
vi.mock("@/auth");
vi.mock("@/app/[locale]/_lib/get-locale-from-html");
vi.mock("../_lib/process-page-html");
vi.mock("next/cache");
vi.mock("next/navigation");

describe("editPageContentAction", () => {
	const mockFormData = new FormData();
	mockFormData.append("pageSlug", "mockUserId1-page1");
	mockFormData.append("title", "Test Title");
	mockFormData.append("userLocale", "en");
	mockFormData.append("pageContent", "<p>Test content</p>");

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.GEMINI_API_KEY = "test-key";
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
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("should successfully update public page and trigger translation", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getLocaleFromHtml).mockResolvedValue("en");

		const result = await editPageContentAction(
			{ success: false },
			mockFormData,
		);

		expect(result.success).toBe(true);
		expect(revalidatePath).toHaveBeenCalledWith(
			"/user/mockUserId1/page/mockUserId1-page1",
		);
	});
});
