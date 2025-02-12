import { uploadImage } from "@/app/[locale]/lib/upload";
import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserImage } from "./db/mutations.server";
import { userImageEditAction } from "./user-image-edit-action";
vi.mock("@/auth");

vi.mock("@/app/[locale]/lib/upload", () => ({
	uploadImage: vi.fn(),
}));

vi.mock("./db/mutations.server", () => ({
	updateUserImage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: (path: string) => path,
}));

describe("userImageEditAction", () => {
	const mockUser = { id: "user123" };
	const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
	const mockFormData = new FormData();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(uploadImage).mockResolvedValue({
			success: true,
			data: { imageUrl: "https://example.com/image.jpg" },
		});
		vi.mocked(updateUserImage).mockResolvedValue(mockUsers[0]);
		mockFormData.set("image", mockFile);
	});

	it("should successfully update user image", async () => {
		const mockImageUrl = "https://example.com/image.jpg";
		await updateUserImage(mockUser.id, mockImageUrl);

		const result = await userImageEditAction({ success: false }, mockFormData);

		expect(result).toEqual({
			success: true,
			data: { imageUrl: mockImageUrl },
			message: "Profile image updated successfully",
		});
		expect(updateUserImage).toHaveBeenCalledWith(mockUser.id, mockImageUrl);
	});

	it("should redirect if user is not authenticated", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);

		const result = await userImageEditAction({ success: false }, mockFormData);
		expect(result).toBe("/auth/login");
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
});
