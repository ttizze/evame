import { json } from "@remix-run/node";
import { createRemixStub } from "@remix-run/testing";
import { describe, expect, test, vi } from "vitest";
import { prisma } from "~/utils/prisma";
import { action } from "./route";

vi.mock("~/utils/prisma", () => ({
	prisma: {
		comment: {
			create: vi.fn(),
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

describe("comment resource route", () => {
	describe("action", () => {
		test("未ログイン状態でコメントを作成しようとするとエラーを返す", async () => {
			const formData = new FormData();
			formData.append("pageId", "1");
			formData.append("content", "test comment");
			formData.append("intent", "create");

			const request = new Request("http://test.com/resources/comment", {
				method: "POST",
				body: formData,
			});

			const response = await action({ request, context: {}, params: {} });
			expect(response).toEqual(
				json({ error: "Login required to comment" }, { status: 401 }),
			);
		});

		test("ログイン状態でコメントを作成できる", async () => {
			const formData = new FormData();
			formData.append("pageId", "1");
			formData.append("content", "test comment");
			formData.append("intent", "create");

			const RemixStub = createRemixStub([
				{
					path: "/resources/comment",
					action: action,
				},
			]);

      const mockComment = {
        id: 1,
        content: "test comment",
        pageId: 1,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          userName: "testuser",
          displayName: "Test User",
          icon: "test-icon.png",
        },
      };

			vi.mocked(prisma.comment.create).mockResolvedValueOnce(mockComment);

			const request = new Request("http://test.com/resources/comment", {
				method: "POST",
				body: formData,
				headers: {
					Cookie: "session_id=123; user_id=1",
				},
			});

			const response = await action({ request, context: {}, params: {} });
			expect(response).toEqual(json({ comment: mockComment }));
			expect(prisma.comment.create).toHaveBeenCalledWith({
				data: {
					content: "test comment",
					pageId: 1,
					userId: 1,
				},
				include: {
					user: {
						select: {
							userName: true,
							displayName: true,
							icon: true,
						},
					},
				},
			});
		});

		test("コメントの削除は作成者のみ可能", async () => {
			const formData = new FormData();
			formData.append("commentId", "1");
			formData.append("pageId", "1");
			formData.append("content", "test");
			formData.append("intent", "delete");

      vi.mocked(prisma.comment.findUnique).mockResolvedValueOnce({
        id: 1,
        userId: 2, // 別のユーザーのコメント
        pageId: 1,
        content: "test comment",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

			const request = new Request("http://test.com/resources/comment", {
				method: "POST",
				body: formData,
				headers: {
					Cookie: "session_id=123; user_id=1",
				},
			});

			const response = await action({ request, context: {}, params: {} });
			expect(response).toEqual(
				json({ error: "Unauthorized" }, { status: 403 }),
			);
			expect(prisma.comment.delete).not.toHaveBeenCalled();
		});

		test("コメントの作成には必須フィールドが必要", async () => {
			const formData = new FormData();
			formData.append("intent", "create");

			const request = new Request("http://test.com/resources/comment", {
				method: "POST",
				body: formData,
				headers: {
					Cookie: "session_id=123; user_id=1",
				},
			});

			const response = await action({ request, context: {}, params: {} });
			expect(response).toEqual(
				json({ error: "Page ID and content are required" }, { status: 400 }),
			);
		});
	});
});
