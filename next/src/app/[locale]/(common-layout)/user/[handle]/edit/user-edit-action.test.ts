import { getCurrentUser, unstable_update } from "@/auth";
import { mockUsers } from "@/tests/mock";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUser } from "./_db/mutations.server";
import { userEditAction } from "./user-edit-action";

vi.mock("@/auth", () => ({
	getCurrentUser: vi.fn(),
	unstable_update: vi.fn(),
}));

// DB mutation のモック
vi.mock("./_db/mutations.server", () => ({
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
		vi.mocked(unstable_update).mockResolvedValue(null);
	});

	it("未認証の場合、ログインページにリダイレクトする", async () => {
		vi.mocked(getCurrentUser).mockResolvedValue(undefined);
		const formData = new FormData();

		await userEditAction({ success: false }, formData);

		expect(redirect).toHaveBeenCalledWith("/auth/login");
		expect(unstable_update).not.toHaveBeenCalled();
	});

	it("正常な入力の場合、プロフィールを更新し、unstable_updateを呼び出す", async () => {
		const formData = new FormData();
		formData.append("name", "Test User");
		formData.append("handle", "mockUserId1");
		formData.append("profile", "My profile");

		const result = await userEditAction({ success: false }, formData);

		// データベース更新の検証
		expect(updateUser).toHaveBeenCalledWith(mockUsers[0].id, {
			name: "Test User",
			handle: "mockUserId1",
			profile: "My profile",
		});

		// unstable_updateが正しく呼び出されたことを検証
		expect(unstable_update).toHaveBeenCalledWith({
			user: {
				handle: "mockUserId1",
				name: "Test User",
				profile: "My profile",
				twitterHandle: undefined,
				image: mockUsers[0].image,
			},
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

		// unstable_updateが呼び出されることを検証
		expect(unstable_update).toHaveBeenCalledWith({
			user: {
				handle: "new-handle",
				name: "Test User",
				profile: "My profile",
				twitterHandle: undefined,
				image: mockUsers[0].image,
			},
		});

		expect(redirect).toHaveBeenCalledWith("/user/new-handle/edit");
	});

	it("twitterHandleも含めて更新する場合、正しくunstable_updateを呼び出す", async () => {
		const formData = new FormData();
		formData.append("name", "Test User");
		formData.append("handle", "mockUserId1");
		formData.append("profile", "My profile");
		formData.append("twitterHandle", "@testuser");

		await userEditAction({ success: false }, formData);

		expect(updateUser).toHaveBeenCalledWith(mockUsers[0].id, {
			name: "Test User",
			handle: "mockUserId1",
			profile: "My profile",
			twitterHandle: "@testuser",
		});

		expect(unstable_update).toHaveBeenCalledWith({
			user: {
				handle: "mockUserId1",
				name: "Test User",
				profile: "My profile",
				twitterHandle: "@testuser",
				image: mockUsers[0].image,
			},
		});
	});

	it("バリデーションエラーの場合、エラーを返し、更新関数は呼ばれない", async () => {
		const formData = new FormData();
		formData.append("name", "a"); // 3文字未満
		formData.append("handle", "12"); // 3文字未満
		formData.append("profile", "My profile");

		const result = await userEditAction({ success: false }, formData);

		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
		expect(updateUser).not.toHaveBeenCalled();
		expect(unstable_update).not.toHaveBeenCalled();
	});

	it("予約済みhandleの場合、エラーを返し、更新関数は呼ばれない", async () => {
		const formData = new FormData();
		formData.append("name", "Test User");
		formData.append("handle", "admin");
		formData.append("profile", "My profile");

		const result = await userEditAction(
			{
				success: false,
			},
			formData,
		);

		expect(result.success).toBe(false);
		expect(!result.success && result.zodErrors).toBeDefined();
		expect(updateUser).not.toHaveBeenCalled();
		expect(unstable_update).not.toHaveBeenCalled();
	});
});
