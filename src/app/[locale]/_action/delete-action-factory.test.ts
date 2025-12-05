import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// authAndValidate は DI で注入するためモック
vi.mock("./auth-and-validate", () => ({
	authAndValidate: vi.fn(),
	authDefaultDeps: {},
}));

import { authAndValidate } from "./auth-and-validate";
import { deleteActionFactory } from "./delete-action-factory";

const schema = z.object({ id: z.number() });

describe("deleteActionFactory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("バリデーション失敗時", () => {
		it("zodErrorsを含む失敗レスポンスを返す", async () => {
			vi.mocked(authAndValidate).mockResolvedValue({
				success: false,
				zodErrors: { id: ["required"] },
			});

			const action = deleteActionFactory(
				{
					inputSchema: schema,
					deleteById: vi.fn(),
					buildRevalidatePaths: () => ["/foo"],
				},
				//biome-ignore lint/suspicious/noExplicitAny: DI用
				{} as any,
			);

			const result = await action(
				{ success: true, data: undefined },
				new FormData(),
			);

			expect(result).toEqual({
				success: false,
				zodErrors: { id: ["required"] },
			});
		});
	});

	describe("削除成功時", () => {
		it("削除 → キャッシュ再検証 → リダイレクトの順で実行する", async () => {
			vi.mocked(authAndValidate).mockResolvedValue({
				success: true,
				currentUser: { id: "user1", handle: "testuser", plan: "free" },
				data: { id: 10 },
			});

			const deps = {
				revalidatePath: vi.fn(),
				redirect: vi.fn(),
				getCurrentUser: vi.fn(),
				parseFormData: vi.fn(),
			};
			const deleteById = vi.fn().mockResolvedValue(undefined);

			const action = deleteActionFactory(
				{
					inputSchema: schema,
					deleteById,
					buildRevalidatePaths: () => ["/foo"],
					buildSuccessRedirect: () => "/bar",
				},
				//biome-ignore lint/suspicious/noExplicitAny: DI用
				deps as any,
			);

			await action({ success: true, data: undefined }, new FormData());

			expect(deleteById).toHaveBeenCalledWith({ id: 10 }, "user1");
			expect(deps.revalidatePath).toHaveBeenCalledWith("/foo");
			expect(deps.redirect).toHaveBeenCalledWith("/bar");
		});

		it("buildSuccessRedirectが未定義の場合、リダイレクトしない", async () => {
			vi.mocked(authAndValidate).mockResolvedValue({
				success: true,
				currentUser: { id: "user1", handle: "testuser", plan: "free" },
				data: { id: 10 },
			});

			const deps = {
				revalidatePath: vi.fn(),
				redirect: vi.fn(),
				getCurrentUser: vi.fn(),
				parseFormData: vi.fn(),
			};

			const action = deleteActionFactory(
				{
					inputSchema: schema,
					deleteById: vi.fn(),
					buildRevalidatePaths: () => ["/foo"],
					// buildSuccessRedirect を指定しない
				},
				//biome-ignore lint/suspicious/noExplicitAny: DI用
				deps as any,
			);

			const result = await action(
				{ success: true, data: undefined },
				new FormData(),
			);

			expect(result).toEqual({
				success: true,
				data: undefined,
				message: "Deleted successfully",
			});
			expect(deps.redirect).not.toHaveBeenCalled();
		});
	});
});
