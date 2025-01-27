// route.test.ts
import { describe, expect, test, vi } from "vitest";
import { authenticator } from "~/utils/auth.server";
import { prisma } from "~/utils/prisma";
import { action } from "./route"; // 今回のactionをimport

// prisma と authenticator をモック
vi.mock("~/utils/prisma", () => ({
	prisma: {
		pageComment: {
			create: vi.fn(),
			findUnique: vi.fn(),
			delete: vi.fn(),
			upsert: vi.fn(),
		},
		pageCommentSegment: {
			createMany: vi.fn(),
			findMany: vi.fn(),
		},
	},
}));

vi.mock("~/utils/auth.server", () => ({
	authenticator: {
		isAuthenticated: vi.fn(),
	},
}));

describe("app/routes/$locale+/user.$handle+/page+/$slug+/comment/route.test.tsx action", () => {
	const context = {};
	const params = {};

	//============================================================
	// 3) ログイン済み + create 正常
	//============================================================
	test("ログイン済み + create → 正常にコメント作成", async () => {
		// ユーザーID=123 を返す
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValueOnce({ id: 123 });

		// prisma.create の返り値モック
		const mockPageComment = {
			id: 1,
			content: "Hello world! This is a test comment. My name is John Doe.",
			pageId: 1,
			userId: 123,
			locale: "en",
			createdAt: new Date(),
			updatedAt: new Date(),
			user: {
				handle: "testuser",
				name: "Test User",
				image: "test.png",
			},
		};
		vi.mocked(prisma.pageComment.create).mockResolvedValueOnce(mockPageComment);

		// pageCommentSegment.createMany のモックを追加
		vi.mocked(prisma.pageCommentSegment.createMany).mockResolvedValueOnce({
			count: 2,
		});
		vi.mocked(prisma.pageCommentSegment.findMany).mockResolvedValueOnce([
			{
				id: 100,
				number: 1,
				text: "This is a long paragraph",
				textAndOccurrenceHash: "bd166934eff8a51318b0fc52a004a01094636559e6a7d68f73a7d7d89875c532",
				pageCommentId: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 101,
				number: 2,
				text: "This is a long paragraph",
				textAndOccurrenceHash: "123d8c2b62ee372c81cbef64e71db8259ab4662426c410ff3d4d1dfd9eee7fa5",
				pageCommentId: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const formData = new FormData();
		formData.append("intent", "create");
		formData.append("pageId", "1");
		formData.append("content", "<p>This is a long paragraph</p><p>This is a long paragraph</p>");
		const request = new Request("http://test.com/comment", {
			method: "POST",
			body: formData,
		});

		const result = await action({ request, context, params });

		// 正しい引数で create が呼ばれた
		expect(prisma.pageComment.create).toHaveBeenCalledWith({
			data: {
				content: "<p>This is a long paragraph</p><p>This is a long paragraph</p>",
				pageId: 1,
				locale: "und",
				userId: 123,
			},
			include: {
				user: {
					select: {
						handle: true,
						name: true,
						image: true,
					},
				},
			},
		});

		// 戻り値に mockComment が含まれる
		expect(result).toMatchObject({
			data: {
				pageComment: mockPageComment,
			},
		});
	});

	//============================================================
	// 4) intent=delete だが commentId が無い → 何もしない
	//============================================================
	test("delete だが commentId 無し → DB操作なし", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValueOnce({ id: 999 });

		const formData = new FormData();
		formData.append("intent", "delete");
		// commentId を appendしていない

		const request = new Request("http://test.com/comment", {
			method: "POST",
			body: formData,
		});
		const result = await action({ request, context, params });

		// findUnique や delete は呼ばれない
		expect(prisma.pageComment.findUnique).not.toHaveBeenCalled();
		expect(prisma.pageComment.delete).not.toHaveBeenCalled();

		// 何かエラーにはならず、普通に返却
		expect(result).toMatchObject({
			data: {
				lastResult: {
					// 特にエラー等は無い
				},
			},
		});
	});

	//============================================================
	// 5) 他人のコメント (userId不一致) → 削除できない
	//============================================================
	test("他人のコメント削除 → DB削除呼ばれない", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValueOnce({ id: 123 });

		// DB上のコメントは userId=999
		vi.mocked(prisma.pageComment.findUnique).mockResolvedValueOnce({
			id: 10,
			userId: 999,
			content: "Hello",
			locale: "en",
			pageId: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const formData = new FormData();
		formData.append("intent", "delete");
		formData.append("pageCommentId", "10");

		const request = new Request("http://test.com/comment", {
			method: "POST",
			body: formData,
		});
		const result = await action({ request, context, params });

		// findUnique は呼ばれる
		expect(prisma.pageComment.findUnique).toHaveBeenCalledWith({
			where: { id: 10 },
			select: { userId: true },
		});
		// 自分のコメントではないので delete は呼ばれない
		expect(prisma.pageComment.delete).not.toHaveBeenCalled();

		expect(result).toMatchObject({
			data: {
				lastResult: {},
			},
		});
	});

	//============================================================
	// 6) 自分のコメント → 削除成功
	//============================================================
	test("自分のコメントなら削除成功", async () => {
		// @ts-ignore
		vi.mocked(authenticator.isAuthenticated).mockResolvedValueOnce({ id: 123 });

		// findUnique で userId=123 が返る
		vi.mocked(prisma.pageComment.findUnique).mockResolvedValueOnce({
			id: 10,
			userId: 123,
			content: "Hello",
			locale: "en",
			pageId: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const formData = new FormData();
		formData.append("intent", "delete");
		formData.append("pageCommentId", "10");

		const request = new Request("http://test.com/comment", {
			method: "POST",
			body: formData,
		});
		const result = await action({ request, context, params });

		expect(prisma.pageComment.findUnique).toHaveBeenCalledWith({
			where: { id: 10 },
			select: { userId: true },
		});
		// 所有者一致 → 削除が呼ばれる
		expect(prisma.pageComment.delete).toHaveBeenCalledWith({
			where: { id: 10 },
		});

		// 正常終了
		expect(result).toMatchObject({
			data: {
				lastResult: {
					// resetForm: true が付いているはず
				},
			},
		});
	});
});
