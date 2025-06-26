// create-delete-action.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/* ─────────────────────────────────────────────
  1. 依存モジュールを hoist-safe にモック
   ──────────────────────────────────────────── */
vi.mock("./auth-and-validate", () => ({
	// テストごとに戻り値を差し替える
	authAndValidate: vi.fn(),
	// 既定 deps を使わないので空で OK
	authDefaultDeps: {},
}));

// モック後に読み込む
// eslint-disable-next-line import/first
import { authAndValidate } from "./auth-and-validate";
import { deleteActionFactory } from "./delete-action-factory";

/* ─────────────────────────────────────────────
  2. 共通ダミー定義
   ──────────────────────────────────────────── */
const schema = z.object({ id: z.number() });

/** テスト用に共通 Action を作るファクトリ */
const actionFactory = (deps: Record<string, unknown> = {}) =>
	deleteActionFactory(
		{
			inputSchema: schema,
			deleteById: vi.fn().mockResolvedValue(undefined),
			buildRevalidatePaths: () => ["/foo"],
			buildSuccessRedirect: () => "/bar",
		},
		//biome-ignore lint/suspicious/noExplicitAny: <>
		deps as any, // 型を満たすため any キャスト
	);

/* ─────────────────────────────────────────────
  3. テスト本体
   ──────────────────────────────────────────── */
describe("createDeleteAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("validation 失敗時は zodErrors を返す", async () => {
		//biome-ignore lint/suspicious/noExplicitAny: <>
		(authAndValidate as any).mockResolvedValue({
			success: false,
			zodErrors: { id: ["required"] },
		});

		const act = actionFactory();
		const res = await act({ success: true, data: undefined }, new FormData());

		expect(res).toEqual({ success: false, zodErrors: { id: ["required"] } });
	});

	it("成功時は delete → revalidate → redirect を行う", async () => {
		//biome-ignore lint/suspicious/noExplicitAny: <>
		(authAndValidate as any).mockResolvedValue({
			success: true,
			currentUser: { id: "1", handle: "u" },
			data: { id: 10 },
		});

		/* 依存を全部 spy にして注入 */
		const deps = {
			revalidatePath: vi.fn(),
			redirect: vi.fn(),
			getCurrentUser: vi.fn(), // AuthDeps を満たすためダミー
			parseFormData: vi.fn(),
		};

		const deleteById = vi.fn().mockResolvedValue(undefined);

		const act = deleteActionFactory(
			{
				inputSchema: schema,
				deleteById,
				buildRevalidatePaths: () => ["/foo"],
				buildSuccessRedirect: () => "/bar",
			},
			//biome-ignore lint/suspicious/noExplicitAny: <>
			deps as any,
		);

		await act({ success: true, data: undefined }, new FormData());

		expect(deleteById).toHaveBeenCalledWith({ id: 10 }, "1");
		expect(deps.revalidatePath).toHaveBeenCalledWith("/foo");
		expect(deps.redirect).toHaveBeenCalledWith("/bar");
	});
});
