// action.test.ts  ─ src 同階層に配置
import { describe, expect, it, vi } from "vitest";

/* ─────────────────── ① 依存をぜんぶモック ─────────────────── */
vi.mock("next/navigation", () => ({
	redirect: vi.fn(), // spy 用
}));
vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));
vi.mock("@/lib/auth-server", () => ({
	getCurrentUser: () => Promise.resolve({ id: 1, handle: "t" }),
}));
vi.mock("@/lib/parse-form-data", () => ({
	parseFormData: () =>
		Promise.resolve({
			success: true,
			data: { pageCommentId: 10, pageId: 99 },
		}),
}));
vi.mock("./_db/queries.server", () => ({
	getPageCommentById: vi.fn().mockResolvedValue({ userId: 1 }),
}));
vi.mock("./_db/mutations.server", () => ({
	deletePageComment: vi.fn().mockResolvedValue(undefined),
}));

import { revalidatePath } from "next/cache";
import { deletePageComment } from "./_db/mutations.server";
/* ─────────────────── ② テスト対象はモック宣言の後で import ─ */
import { deletePageCommentAction } from "./action";

/* ─────────────────── ③ テスト ─────────────────── */
describe("deletePageCommentAction", () => {
	it("deletes comment, revalidates, and redirects", async () => {
		/* 空の FormData—中身は parseFormData モックで固定済み */
		await deletePageCommentAction(
			{ success: true, data: undefined },
			new FormData(),
		);

		/* 削除関数が正しい ID で呼ばれる */
		expect(deletePageComment).toHaveBeenCalledWith(10, 1);

		/* キャッシュ再検証 */
		expect(revalidatePath).toHaveBeenCalledWith("/user/t/page/99");
	});
});
