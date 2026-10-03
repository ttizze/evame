import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { db } from "@/db";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createPageComment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { deletePageCommentAction } from "./action";

// このテストファイル用のDBをセットアップ
await setupDbPerFile(import.meta.url);

// 共有依存のみモック
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));

describe("deletePageCommentAction", () => {
	beforeEach(async () => {
		await resetDatabase();
		vi.clearAllMocks();
	});

	describe("認証チェック", () => {
		it("未認証の場合、ログインページにリダイレクトする", async () => {
			vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
			const formData = new FormData();
			formData.append("pageCommentId", "1");
			formData.append("pageId", "1");

			await expect(
				deletePageCommentAction({
					data: {
						pageCommentId: Number(formData.get("pageCommentId")),
						pageId: Number(formData.get("pageId")),
						locale: "en",
					},
				}),
			).rejects.toMatchObject({ options: { href: "/en/auth/login" } });
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
			vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
				toSessionUser(user),
			);

			const formData = new FormData();
			formData.append("pageCommentId", comment.id.toString());
			formData.append("pageId", page.id.toString());

			const result = await deletePageCommentAction({
				data: {
					pageCommentId: Number(formData.get("pageCommentId")),
					pageId: Number(formData.get("pageId")),
					locale: "en",
				},
			});

			expect(result.success).toBe(true);

			// DBの状態を確認（論理削除されている）
			const deletedComment = await db
				.selectFrom("pageComments")
				.selectAll()
				.where("id", "=", comment.id)
				.executeTakeFirst();
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
			vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
				toSessionUser(otherUser),
			);

			const formData = new FormData();
			formData.append("pageCommentId", comment.id.toString());
			formData.append("pageId", page.id.toString());

			await expect(
				deletePageCommentAction({
					data: {
						pageCommentId: Number(formData.get("pageCommentId")),
						pageId: Number(formData.get("pageId")),
						locale: "en",
					},
				}),
			).rejects.toThrow("Comment not found or not owned by user");

			const unchangedComment = await db
				.selectFrom("pageComments")
				.selectAll()
				.where("id", "=", comment.id)
				.executeTakeFirst();
			expect(unchangedComment?.isDeleted).toBe(false);
		});

		it("存在しないコメントを削除しようとするとエラー", async () => {
			const user = await createUser({ handle: "testuser" });
			const page = await createPage({ userId: user.id, slug: "test-page" });
			vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
				toSessionUser(user),
			);

			const formData = new FormData();
			formData.append("pageCommentId", "999999");
			formData.append("pageId", page.id.toString());

			await expect(
				deletePageCommentAction({
					data: {
						pageCommentId: Number(formData.get("pageCommentId")),
						pageId: Number(formData.get("pageId")),
						locale: "en",
					},
				}),
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
				.updateTable("pageComments")
				.set({ replyCount: 1 })
				.where("id", "=", parent.id)
				.execute();

			vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
				toSessionUser(user),
			);

			const formData = new FormData();
			formData.append("pageCommentId", reply.id.toString());
			formData.append("pageId", page.id.toString());

			await deletePageCommentAction({
				data: {
					pageCommentId: Number(formData.get("pageCommentId")),
					pageId: Number(formData.get("pageId")),
					locale: "en",
				},
			});

			const updatedParent = await db
				.selectFrom("pageComments")
				.selectAll()
				.where("id", "=", parent.id)
				.executeTakeFirst();
			expect(updatedParent?.replyCount).toBe(0);
		});
	});
});

vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: <T>(handler: T) => handler,
		};
		return builder;
	},
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: () => new Headers(),
	setResponseHeader: vi.fn(),
}));
