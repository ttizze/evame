import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { mockCurrentUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { userEditAction } from "./user-edit-action";

// このテストファイル用のDBをセットアップ
await setupDbPerFile(import.meta.url);

// 共有依存のみモック（外部認証システム）
vi.mock("@/app/_service/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));

describe("userEditAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	describe("認証チェック", () => {
		it("未認証の場合、ログインページにリダイレクトする", async () => {
			mockCurrentUser(null);
			const formData = new FormData();

			await expect(
				userEditAction({ success: false }, formData),
			).rejects.toThrow(/NEXT_REDIRECT/);
			expect(redirect).toHaveBeenCalledWith("/auth/login");
		});
	});

	describe("バリデーション", () => {
		it("名前が3文字未満の場合、バリデーションエラーを返す", async () => {
			const user = await createUser({ handle: "testuser" });
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("name", "ab");
			formData.append("handle", "testuser");
			formData.append("profile", "");

			const result = await userEditAction({ success: false }, formData);

			expect(result.success).toBe(false);
			expect(!result.success && result.zodErrors?.name).toBeDefined();
		});

		it("予約済みhandleの場合、バリデーションエラーを返す", async () => {
			const user = await createUser({ handle: "testuser" });
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("name", "Test User");
			formData.append("handle", "admin");
			formData.append("profile", "");

			const result = await userEditAction({ success: false }, formData);

			expect(result.success).toBe(false);
			expect(!result.success && result.zodErrors?.handle).toBeDefined();
		});

		it("handleが数字のみの場合、バリデーションエラーを返す", async () => {
			const user = await createUser({ handle: "testuser" });
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("name", "Test User");
			formData.append("handle", "12345");
			formData.append("profile", "");

			const result = await userEditAction({ success: false }, formData);

			expect(result.success).toBe(false);
			expect(!result.success && result.zodErrors?.handle).toBeDefined();
		});
	});

	describe("プロフィール更新", () => {
		it("正常な入力の場合、DBを更新して成功を返す", async () => {
			const user = await createUser({ handle: "testuser" });
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("name", "Updated Name");
			formData.append("handle", "testuser");
			formData.append("profile", "My profile");

			const result = await userEditAction({ success: false }, formData);

			expect(result).toEqual({
				success: true,
				message: "User updated successfully",
				data: {
					name: "Updated Name",
					profile: "My profile",
					twitterHandle: undefined,
				},
			});

			const updatedUser = await db
				.selectFrom("users")
				.selectAll()
				.where("id", "=", user.id)
				.executeTakeFirst();
			expect(updatedUser?.name).toBe("Updated Name");
			expect(updatedUser?.profile).toBe("My profile");

			expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
		});

		it("twitterHandleを含めて更新できる", async () => {
			const user = await createUser({ handle: "testuser" });
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("name", "Test User");
			formData.append("handle", "testuser");
			formData.append("profile", "");
			formData.append("twitterHandle", "@testuser");

			const result = await userEditAction({ success: false }, formData);

			expect(result.success).toBe(true);

			const updatedUser = await db
				.selectFrom("users")
				.selectAll()
				.where("id", "=", user.id)
				.executeTakeFirst();
			expect(updatedUser?.twitterHandle).toBe("@testuser");
		});
	});

	describe("handle変更", () => {
		it("handleが変更された場合、新しいhandleのページにリダイレクトする", async () => {
			const user = await createUser({ handle: "oldhandle" });
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("name", "Test User");
			formData.append("handle", "newhandle");
			formData.append("profile", "");

			await expect(
				userEditAction({ success: false }, formData),
			).rejects.toThrow(/NEXT_REDIRECT/);

			const updatedUser = await db
				.selectFrom("users")
				.selectAll()
				.where("id", "=", user.id)
				.executeTakeFirst();
			expect(updatedUser?.handle).toBe("newhandle");

			expect(redirect).toHaveBeenCalledWith("/newhandle/edit");
			expect(revalidatePath).not.toHaveBeenCalled();
		});
	});
});
