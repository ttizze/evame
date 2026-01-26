import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "@/app/[locale]/_service/upload/upload-image";
import { db } from "@/db";
import { mockCurrentUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { userImageEditAction } from "./user-image-edit-action";

// このテストファイル用のDBをセットアップ
await setupDbPerFile(import.meta.url);

// 共有依存のみモック
vi.mock("@/app/_service/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));
vi.mock("@/app/[locale]/_service/upload/upload-image", () => ({
	uploadImage: vi.fn(),
}));

describe("userImageEditAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	describe("認証チェック", () => {
		it("未認証の場合、ログインページにリダイレクトする", async () => {
			mockCurrentUser(null);
			const formData = new FormData();

			await expect(
				userImageEditAction({ success: false }, formData),
			).rejects.toThrow(/NEXT_REDIRECT/);
			expect(redirect).toHaveBeenCalledWith("/auth/login");
		});
	});

	describe("バリデーション", () => {
		it("画像が指定されていない場合、エラーを返す", async () => {
			const user = await createUser();
			mockCurrentUser(user);
			const formData = new FormData();

			const result = await userImageEditAction({ success: false }, formData);

			expect(result).toEqual({
				success: false,
				message: "No image provided",
			});
		});

		it("画像サイズが5MBを超える場合、エラーを返す", async () => {
			const user = await createUser();
			mockCurrentUser(user);

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
	});

	describe("アップロード失敗", () => {
		it("アップロードが失敗した場合、エラーを返す", async () => {
			const user = await createUser();
			mockCurrentUser(user);
			vi.mocked(uploadImage).mockResolvedValue({
				success: false,
				message: "Upload failed",
			});

			const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
			const formData = new FormData();
			formData.set("image", file);

			const result = await userImageEditAction({ success: false }, formData);

			expect(result).toEqual({
				success: false,
				message: "Failed to upload image",
			});
		});
	});

	describe("画像更新成功", () => {
		it("正常にアップロードした場合、DBを更新して成功を返す", async () => {
			const user = await createUser();
			mockCurrentUser(user);
			const mockImageUrl = "https://example.com/uploaded-image.jpg";
			vi.mocked(uploadImage).mockResolvedValue({
				success: true,
				data: { imageUrl: mockImageUrl },
			});

			const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
			const formData = new FormData();
			formData.set("image", file);

			const result = await userImageEditAction({ success: false }, formData);

			expect(result).toEqual({
				success: true,
				data: { imageUrl: mockImageUrl },
				message: "Profile image updated successfully",
			});

			const updatedUser = await db
				.selectFrom("users")
				.selectAll()
				.where("id", "=", user.id)
				.executeTakeFirst();
			expect(updatedUser?.image).toBe(mockImageUrl);

			expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
		});
	});
});
