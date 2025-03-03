import { getPageById } from "@/app/[locale]/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { mockPages, mockUsers } from "@/tests/mock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertTags } from "../../db/mutations.server";
import { editPageTagsAction } from "./action";

// Mocking dependencies
vi.mock("@/auth");
vi.mock("@/app/[locale]/_db/queries.server");
vi.mock("../../db/mutations.server");
vi.mock("next/navigation");
vi.mock("next/cache");

describe("editPageTagsAction", () => {
	const mockTags = [
		{ id: 1, name: "tag1" },
		{ id: 2, name: "tag2" },
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(getPageById).mockResolvedValue(mockPages[0]);
		vi.mocked(upsertTags).mockResolvedValue(mockTags);
	});

	it("should successfully update tags", async () => {
		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("tags", JSON.stringify(["tag1", "tag2"]));

		const result = await editPageTagsAction({ success: false }, formData);

		expect(result).toEqual({ success: true });
		expect(upsertTags).toHaveBeenCalledWith(["tag1", "tag2"], 1);
		expect(revalidatePath).toHaveBeenCalledWith(
			"/user/mockUserId1/page/mockUserId1-page1/edit",
		);
	});

	it("should return validation error for invalid tags", async () => {
		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("tags", JSON.stringify(["invalid tag with space"]));

		const result = await editPageTagsAction({ success: false }, formData);

		expect(result.success).toBe(false);
		expect(result.zodErrors).toBeDefined();
	});

	it("should redirect if user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("tags", JSON.stringify(["tag1"]));

		await editPageTagsAction({ success: false }, formData);

		expect(redirect).toHaveBeenCalledWith("/auth/login");
	});

	it("should redirect if user does not own the page", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[1]);

		const formData = new FormData();
		formData.append("pageId", "1");
		formData.append("tags", JSON.stringify(["tag1"]));

		await editPageTagsAction({ success: false }, formData);

		expect(redirect).toHaveBeenCalledWith("/auth/login");
	});
});
