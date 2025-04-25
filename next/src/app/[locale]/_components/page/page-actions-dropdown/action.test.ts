// togglePublishAction.test.ts
import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { togglePublishAction } from "./action";
import { togglePagePublicStatus } from "./db/mutations.server";
// モジュールの依存関数をモック
vi.mock("@/auth");
vi.mock("next/cache");
vi.mock("@/app/[locale]/db/queries.server");
vi.mock("./db/mutations.server");

describe("togglePublishAction", () => {
	beforeEach(async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
	});

	afterEach(async () => {
		vi.clearAllMocks();
	});
	it("should toggle publish status and return success", async () => {
		vi.mocked(togglePagePublicStatus).mockResolvedValueOnce({
			id: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: "test",
			content: "test",
			mdastJson: {},
			sourceLocale: "en",
			status: "PUBLIC",
			userId: mockUsers[0].id,
		});

		const formData = new FormData();
		formData.append("pageId", "1");

		const result = await togglePublishAction({ success: false }, formData);
		expect(togglePagePublicStatus).toHaveBeenCalledWith(1, mockUsers[0].id);
		expect(result.success).toBe(true);
		expect(result.message).toBe("Page status updated successfully");
	});

	it("should redirect to login if user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);
		const formData = new FormData();
		formData.append("pageId", "1");

		await expect(
			togglePublishAction({ success: false }, formData),
		).rejects.toThrow("NEXT_REDIRECT");
	});

	it("should return error if form data is invalid", async () => {
		const formData = new FormData();
		formData.append("pageId", "invalid");

		const result = await togglePublishAction({ success: false }, formData);
		expect(result.success).toBe(false);
		expect(result.message).toBe("Invalid form data");
		expect(result.zodErrors).toEqual({
			pageId: ["Expected number, received nan"],
		});
	});
});
