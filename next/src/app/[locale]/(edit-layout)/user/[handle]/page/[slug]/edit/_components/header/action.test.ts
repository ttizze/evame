import { getPageById } from "@/app/[locale]/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { mockPages, mockUsers } from "@/tests/mock";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { editPageStatusAction } from "./action";
vi.mock("@/auth");
vi.mock("@/app/[locale]/lib/get-locale-from-html");
vi.mock("next/cache");
vi.mock("next/navigation");
vi.mock("./_db/mutations.server");
vi.mock("./_lib/handle-page-translation");
vi.mock("@/app/[locale]/_db/queries.server");
describe("editPageStatusAction", () => {
	const mockFormData = new FormData();
	mockFormData.append("pageId", "1");
	mockFormData.append("status", "PUBLIC");

	beforeEach(() => {
		vi.resetAllMocks();
		process.env.GEMINI_API_KEY = "test-key";
	});

	it("should return validation error for invalid form data", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);

		const invalidFormData = new FormData();
		invalidFormData.append("slug", "");

		const result = await editPageStatusAction(
			{ success: false },
			invalidFormData,
		);

		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
	});

	it("should successfully update public page and trigger translation", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		// @ts-ignore
		vi.mocked(getPageById).mockResolvedValue(mockPages[0]);

		const result = await editPageStatusAction({ success: false }, mockFormData);

		expect(result.success).toBe(true);
		expect(result.message).toBe("Started translation.");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/user/mockUserId1/page/mockUserId1-page1/edit",
		);
	});

	it("should handle missing GEMINI_API_KEY for public pages", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		// @ts-ignore
		vi.mocked(getPageById).mockResolvedValue(mockPages[0]);

		// biome-ignore lint/performance/noDelete: <explanation>
		delete process.env.GEMINI_API_KEY;

		const result = await editPageStatusAction({ success: false }, mockFormData);

		expect(result.success).toBe(true);
		expect(result.message).toBe(
			"Gemini API key is not set. Page will not be translated.",
		);
		expect(revalidatePath).toHaveBeenCalledWith(
			"/user/mockUserId1/page/mockUserId1-page1/edit",
		);
	});

	it("should skip translation for non-public pages", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		// @ts-ignore
		vi.mocked(getPageById).mockResolvedValue(mockPages[0]);

		const result = await editPageStatusAction({ success: false }, mockFormData);

		expect(result.success).toBe(true);
	});
});
