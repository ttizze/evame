import { getCurrentUser } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUser } from "./db/mutations.server";
import { userEditAction } from "./user-edit-action";

vi.mock("@/auth");
// DB mutation のモック
vi.mock("./db/mutations.server", () => ({
	updateUser: vi.fn(),
}));

// Next.js redirect のモック
vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

describe("userEditAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue(mockUsers[0]);
		vi.mocked(updateUser).mockResolvedValue(mockUsers[0]);
	});

	it("未認証の場合、ログインページにリダイレクトする", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);
		const formData = new FormData();

		await userEditAction({ success: false }, formData);

		expect(redirect).toHaveBeenCalledWith("/auth/login");
	});

	it("正常な入力の場合、プロフィールを更新する", async () => {
		const formData = new FormData();
		formData.append("name", "Test User");
		formData.append("handle", "mockUserId1");
		formData.append("profile", "My profile");

		const result = await userEditAction({ success: false }, formData);
		expect(updateUser).toHaveBeenCalledWith(mockUsers[0].id, {
			name: "Test User",
			handle: "mockUserId1",
			profile: "My profile",
		});
		expect(result).toEqual({
			success: true,
			message: "User updated successfully",
			data: {
				name: "Test User",
				profile: "My profile",
			},
		});
	});

	it("handleが変更された場合、新しいhandleのページにリダイレクトする", async () => {
		const formData = new FormData();
		formData.append("name", "Test User");
		formData.append("handle", "new-handle");
		formData.append("profile", "My profile");

		await userEditAction({ success: false }, formData);

		expect(redirect).toHaveBeenCalledWith("/user/new-handle/edit");
	});

	it("バリデーションエラーの場合、エラーを返す", async () => {
		const formData = new FormData();
		formData.append("name", "a"); // 3文字未満
		formData.append("handle", "12"); // 3文字未満
		formData.append("profile", "My profile");

		const result = await userEditAction({ success: false }, formData);

		expect(result.success).toBe(false);
		expect(result.zodErrors).toBeDefined();
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("予約済みhandleの場合、エラーを返す", async () => {
		const formData = new FormData();
		formData.append("name", "Test User");
		formData.append("handle", "admin");
		formData.append("profile", "My profile");

		const result = await userEditAction(
			{
				success: false,
				data: {
					name: "Test User",
					profile: "My profile",
				},
			},
			formData,
		);

		expect(result.success).toBe(false);
		expect(result.zodErrors?.handle).toBeDefined();
		expect(updateUser).not.toHaveBeenCalled();
	});
});
