"use server";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { mockCurrentUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { togglePublishAction } from "./action";

// このテストファイル用のDBをセットアップ
await setupDbPerFile(import.meta.url);

// 共有依存のみモック（外部認証システム）
vi.mock("@/app/_service/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));

describe("togglePublishAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	describe("認証チェック", () => {
		it("未認証の場合、ログインページにリダイレクトする", async () => {
			mockCurrentUser(null);
			const formData = new FormData();
			formData.append("pageId", "1");

			await expect(
				togglePublishAction({ success: false }, formData),
			).rejects.toThrow(/NEXT_REDIRECT/);
			expect(redirect).toHaveBeenCalledWith("/auth/login");
		});
	});

	describe("バリデーション", () => {
		it("pageIdが指定されていない場合、バリデーションエラーを返す", async () => {
			const user = await createUser();
			mockCurrentUser(user);
			const formData = new FormData();

			const result = await togglePublishAction({ success: false }, formData);

			expect(result.success).toBe(false);
			expect(!result.success && result.zodErrors?.pageId).toBeDefined();
		});
	});

	describe("ページステータス切り替え", () => {
		it("PUBLICなページをDRAFTに切り替える", async () => {
			const user = await createUser();
			const page = await createPage({
				userId: user.id,
				slug: "test-page",
				status: "PUBLIC",
			});
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());

			const result = await togglePublishAction({ success: false }, formData);

			expect(result).toEqual({
				success: true,
				data: undefined,
				message: "Page status updated successfully",
			});

			const updatedPage = await db
				.selectFrom("pages")
				.selectAll()
				.where("id", "=", page.id)
				.executeTakeFirst();
			expect(updatedPage?.status).toBe("DRAFT");
		});

		it("DRAFTなページをPUBLICに切り替える", async () => {
			const user = await createUser();
			const page = await createPage({
				userId: user.id,
				slug: "test-page",
				status: "DRAFT",
			});
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());

			const result = await togglePublishAction({ success: false }, formData);

			expect(result.success).toBe(true);

			const updatedPage = await db
				.selectFrom("pages")
				.selectAll()
				.where("id", "=", page.id)
				.executeTakeFirst();
			expect(updatedPage?.status).toBe("PUBLIC");
		});

		it("他のユーザーのページは切り替えできない", async () => {
			const owner = await createUser();
			const otherUser = await createUser();
			const page = await createPage({
				userId: owner.id,
				slug: "test-page",
				status: "PUBLIC",
			});
			mockCurrentUser(otherUser);

			const formData = new FormData();
			formData.append("pageId", page.id.toString());

			await expect(
				togglePublishAction({ success: false }, formData),
			).rejects.toThrow("Unauthorized");
		});

		it("存在しないページIDの場合、エラーを投げる", async () => {
			const user = await createUser();
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("pageId", "999999");

			await expect(
				togglePublishAction({ success: false }, formData),
			).rejects.toThrow("Page not found");
		});
	});
});
