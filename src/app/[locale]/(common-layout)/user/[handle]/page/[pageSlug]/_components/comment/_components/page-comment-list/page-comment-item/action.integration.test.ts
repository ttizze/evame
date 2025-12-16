import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/drizzle";
import { pageComments } from "@/drizzle/schema";
import { mockCurrentUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createPageComment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { deletePageCommentAction } from "./action";

// このテストファイル用のDBをセットアップ
await setupDbPerFile(import.meta.url);

// 共有依存のみモック
vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: vi.fn(),
}));

describe("deletePageCommentAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	describe("認証チェック", () => {
		it("未認証の場合、ログインページにリダイレクトする", async () => {
			mockCurrentUser(null);
			const formData = new FormData();
			formData.append("pageCommentId", "1");
			formData.append("pageId", "1");

			await expect(
				deletePageCommentAction({ success: false }, formData),
			).rejects.toThrow(/NEXT_REDIRECT/);
			expect(redirect).toHaveBeenCalledWith("/auth/login");
		});
	});

	describe("コメント削除", () => {
		it("自分のコメントを論理削除できる", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({ userId: user.id, slug: "test-page" });
			const comment = await createPageComment({
				userId: user.id,
				pageId: page.id,
			});
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("pageCommentId", comment.id.toString());
			formData.append("pageId", page.id.toString());

			const result = await deletePageCommentAction(
				{ success: false },
				formData,
			);

			expect(result.success).toBe(true);

			// DBの状態を確認（論理削除されている）
			const [deletedComment] = await db
				.select()
				.from(pageComments)
				.where(eq(pageComments.id, comment.id))
				.limit(1);
			expect(deletedComment?.isDeleted).toBe(true);
			expect(deletedComment?.mdastJson).toEqual({
				type: "root",
				children: [
					{ type: "paragraph", children: [{ type: "text", value: "deleted" }] },
				],
			});
		});

		it("他のユーザーのコメントは削除できない", async () => {
			const owner = await createUser();
			const otherUser = await createUser({ handle: "other" });
			const page = await createPage({ userId: owner.id, slug: "test-page" });
			const comment = await createPageComment({
				userId: owner.id,
				pageId: page.id,
			});
			mockCurrentUser(otherUser);

			const formData = new FormData();
			formData.append("pageCommentId", comment.id.toString());
			formData.append("pageId", page.id.toString());

			await expect(
				deletePageCommentAction({ success: false }, formData),
			).rejects.toThrow("Comment not found or not owned by user");

			const [unchangedComment] = await db
				.select()
				.from(pageComments)
				.where(eq(pageComments.id, comment.id))
				.limit(1);
			expect(unchangedComment?.isDeleted).toBe(false);
		});

		it("存在しないコメントを削除しようとするとエラー", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({ userId: user.id, slug: "test-page" });
			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("pageCommentId", "999999");
			formData.append("pageId", page.id.toString());

			await expect(
				deletePageCommentAction({ success: false }, formData),
			).rejects.toThrow("Comment not found or not owned by user");
		});
	});

	describe("返信カウント更新", () => {
		it("返信を削除すると親の返信カウントが減少する", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({ userId: user.id, slug: "test-page" });
			const parent = await createPageComment({
				userId: user.id,
				pageId: page.id,
			});
			const reply = await createPageComment({
				userId: user.id,
				pageId: page.id,
				parentId: parent.id,
			});

			await db
				.update(pageComments)
				.set({ replyCount: 1 })
				.where(eq(pageComments.id, parent.id));

			mockCurrentUser(user);

			const formData = new FormData();
			formData.append("pageCommentId", reply.id.toString());
			formData.append("pageId", page.id.toString());

			await deletePageCommentAction({ success: false }, formData);

			const [updatedParent] = await db
				.select()
				.from(pageComments)
				.where(eq(pageComments.id, parent.id))
				.limit(1);
			expect(updatedParent?.replyCount).toBe(0);
		});
	});
});
