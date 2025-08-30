import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth-server";
import { mockUsers } from "@/tests/mock";
import { updateUser } from "../_db/mutations.server";
import { userEditAction } from "./user-edit-action";

vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));

// DB mutation のモック
vi.mock("../_db/mutations.server", () => ({
	updateUser: vi.fn(),
}));

// Next.js redirect のモック（本番と同様に throw する）
vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
}));

// Next.js cache のモック
vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
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
		await expect(userEditAction({ success: false }, formData)).rejects.toThrow(
			/NEXT_REDIRECT:\/auth\/login/,
		);

		expect(redirect).toHaveBeenCalledWith("/auth/login");
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
		expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/settings/profile");
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

		await expect(userEditAction({ success: false }, formData)).rejects.toThrow(
			/NEXT_REDIRECT:\/user\/new-handle\/edit/,
		);

		// handleが変更された場合、revalidatePathは呼び出されない
		expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();

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

		expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/settings/profile");
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
	});
});
