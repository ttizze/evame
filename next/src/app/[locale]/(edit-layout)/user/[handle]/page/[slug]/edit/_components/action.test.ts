import { detectLocale } from "@/app/[locale]/_lib/detect-locale";
import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertPageAndSegments } from "../_db/mutations.server";
import { editPageContentAction } from "./action";
// Mocks
vi.mock("@/auth");
vi.mock("@/app/[locale]/_lib/detect-locale");
vi.mock("../_lib/process-page-html");
vi.mock("next/cache");
vi.mock("next/navigation");
vi.mock("../_db/mutations.server", () => ({
	upsertPageAndSegments: vi.fn(),
}));

describe("editPageContentAction", () => {
	const mockFormData = new FormData();
	mockFormData.append("slug", "mockUserId1-page1");
	mockFormData.append("title", "Test Title");
	mockFormData.append("userLocale", "en");
	mockFormData.append(
		"pageContent",
		'{"type": "doc", "content": [{"type": "paragraph"}]}',
	);

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
		vi.mocked(detectLocale).mockResolvedValue("en");

		// Set up the mock implementation to return void
		vi.mocked(upsertPageAndSegments).mockImplementation(async () => {
			// Function returns void
			return;
		});

		const result = await editPageContentAction(
			{ success: false },
			mockFormData,
		);

		expect(result.success).toBe(true);
		expect(result.message).toBe("Page updated successfully!");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/user/mockUserId1/page/mockUserId1-page1",
		);
	});
});
