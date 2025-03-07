// commentDeleteAction.test.ts
import { describe, expect, it, vi } from "vitest";
import { commentDeleteAction } from "./action";

const validUser = { id: 1, handle: "testuser" };

// テスト用の FormData を作成
const validFormData = new FormData();
validFormData.append("pageCommentId", "123");
validFormData.append("pageId", "456");

// 共通の依存オブジェクトを生成するヘルパー関数
const createDeps = (
	overrides: Partial<Parameters<typeof commentDeleteAction>[2]> = {},
) => ({
	getCurrentUser: vi.fn().mockResolvedValue(validUser),
	parseFormData: vi.fn(),
	getPageCommentById: vi.fn(),
	deletePageComment: vi.fn(),
	revalidatePath: vi.fn(),
	redirect: vi.fn(() => {
		throw new Error("Redirect called");
	}) as unknown as typeof import("next/navigation").redirect,
	...overrides,
});

describe("commentDeleteAction", () => {
	it("ユーザーが未ログインの場合、リダイレクトされる", async () => {
		// getCurrentUser を上書きして null を返す
		const deps = createDeps({
			getCurrentUser: vi.fn().mockResolvedValue(null),
		});
		await expect(
			commentDeleteAction({ success: true }, validFormData, deps),
		).rejects.toThrow("Redirect called");

		expect(deps.getCurrentUser).toHaveBeenCalled();
		expect(deps.redirect).toHaveBeenCalledWith("/auth/login");
	});

	it("フォームデータのパースに失敗した場合、エラーが返る", async () => {
		// parseFormData で返すエラー情報をモック
		const zodErrorMock = {
			flatten: () => ({ fieldErrors: { pageCommentId: ["Invalid number"] } }),
		};
		const deps = createDeps({
			parseFormData: vi
				.fn()
				.mockResolvedValue({ success: false, error: zodErrorMock }),
		});

		const result = await commentDeleteAction(
			{ success: true },
			validFormData,
			deps,
		);

		expect(deps.parseFormData).toHaveBeenCalled();
		expect(result).toEqual({
			success: false,
			zodErrors: { pageCommentId: ["Invalid number"] },
		});
	});

	it("指定したコメントが存在しない場合、エラーが返る", async () => {
		const deps = createDeps({
			parseFormData: vi.fn().mockResolvedValue({
				success: true,
				data: { pageCommentId: 123, pageId: 456 },
			}),
			// getPageCommentById が null を返す（存在しない場合）
			getPageCommentById: vi.fn().mockResolvedValue(null),
		});

		const result = await commentDeleteAction(
			{ success: true },
			validFormData,
			deps,
		);

		expect(deps.getPageCommentById).toHaveBeenCalledWith(123);
		expect(result).toEqual({
			success: false,
			message: "You are not allowed to delete this comment",
		});
	});

	it("コメントの所有者が現在のユーザーと異なる場合、エラーが返る", async () => {
		// 現在のユーザーと異なるユーザーIDを持つコメントを返す
		const otherUserComment = { id: 123, userId: 999 };
		const deps = createDeps({
			parseFormData: vi.fn().mockResolvedValue({
				success: true,
				data: { pageCommentId: 123, pageId: 456 },
			}),
			getPageCommentById: vi.fn().mockResolvedValue(otherUserComment),
		});

		const result = await commentDeleteAction(
			{ success: true },
			validFormData,
			deps,
		);

		expect(result).toEqual({
			success: false,
			message: "You are not allowed to delete this comment",
		});
	});

	it("正常系: コメント削除に成功し、キャッシュが再検証される", async () => {
		const userComment = { id: 123, userId: validUser.id };
		const deps = createDeps({
			parseFormData: vi.fn().mockResolvedValue({
				success: true,
				data: { pageCommentId: 123, pageId: 456 },
			}),
			getPageCommentById: vi.fn().mockResolvedValue(userComment),
			deletePageComment: vi.fn().mockResolvedValue(undefined),
		});

		const result = await commentDeleteAction(
			{ success: true },
			validFormData,
			deps,
		);

		expect(deps.deletePageComment).toHaveBeenCalledWith(123);
		expect(deps.revalidatePath).toHaveBeenCalledWith(
			`/user/${validUser.handle}/page/456`,
		);
		expect(result).toEqual({ success: true });
	});
});
