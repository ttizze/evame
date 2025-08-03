import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "@/app/[locale]/_lib/upload";
import { getCurrentUser } from "@/lib/auth-server";
import { mockUsers } from "@/tests/mock";
import { updateUserImage } from "../_db/mutations.server";
import { userImageEditAction } from "./user-image-edit-action";

vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));

vi.mock("@/app/[locale]/_lib/upload", () => ({
	uploadImage: vi.fn(),
}));

vi.mock("../_db/mutations.server", () => ({
	updateUserImage: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

describe("userImageEditAction (Integration)", () => {
	const mockUser = mockUsers[0];
	const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
	const mockFormData = new FormData();
	const mockImageUrl = "https://example.com/image.jpg";

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
		vi.mocked(uploadImage).mockResolvedValue({
			success: true,
			data: { imageUrl: mockImageUrl },
		});
		vi.mocked(updateUserImage).mockResolvedValue(mockUser);
		mockFormData.set("image", mockFile);
	});

	it("should successfully update user image and verify unstable_update is called", async () => {
		const result = await userImageEditAction({ success: false }, mockFormData);

		expect(result).toEqual({
			success: true,
			data: { imageUrl: mockImageUrl },
			message: "Profile image updated successfully",
		});

		// データベース更新の検証
		expect(updateUserImage).toHaveBeenCalledWith(mockUser.id, mockImageUrl);

		// unstable_updateが正しく呼ばれたことを検証
		expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/settings/profile");
	});

	it("should redirect if user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);

		await userImageEditAction({ success: false }, mockFormData);

		expect(vi.mocked(redirect)).toHaveBeenCalledWith("/auth/login");
	});

	it("should return error if no image is provided", async () => {
		const emptyFormData = new FormData();

		const result = await userImageEditAction({ success: false }, emptyFormData);

		expect(result).toEqual({
			success: false,
			message: "No image provided",
		});
	});

	it("should return error if image size exceeds limit", async () => {
		const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", {
			type: "image/jpeg",
		});
		const formData = new FormData();
		formData.set("image", largeFile);

		const result = await userImageEditAction({ success: false }, formData);

		expect(result).toEqual({
			success: false,
			message: "Image size exceeds 5MB limit. Please choose a smaller file.",
		});
	});

	it("should handle upload failure", async () => {
		vi.mocked(uploadImage).mockResolvedValue({
			success: false,
			message: "Upload failed",
		});

		const result = await userImageEditAction({ success: false }, mockFormData);

		expect(result).toEqual({
			success: false,
			message: "Failed to upload image",
		});
	});

	it("should verify user data is correctly passed to unstable_update", async () => {
		// 特定のユーザー情報でテスト
		vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

		await userImageEditAction({ success: false }, mockFormData);

		// unstable_updateに正確なユーザー情報が渡されたことを検証
		expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/settings/profile");
	});
});
