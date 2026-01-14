import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { revalidatePageTreeAllLocales } from "./revalidate-utils";

// このテストファイル用のDBをセットアップ
await setupDbPerFile(import.meta.url);

// t-wada TDD style
// - 明確なコンテキスト（describe）
// - Given / When / Then の段落コメント
// - 余計な前提を置かない、観測可能な振る舞いのみ検証

describe("revalidatePageTreeAllLocales", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("ページが存在する", () => {
		it("祖先と公開な子孫を全ロケールで再検証する", async () => {
			// Given: gp -> p -> self -> c1 -> gc1
			//                    └─ c2
			const user = await createUser({ handle: "u" });
			const gp = await createPage({ slug: "p2", userId: user.id });
			const p = await createPage({
				slug: "p1",
				userId: user.id,
				parentId: gp.id,
			});
			const self = await createPage({
				slug: "self",
				userId: user.id,
				parentId: p.id,
			});
			const c1 = await createPage({
				slug: "c1",
				userId: user.id,
				parentId: self.id,
			});
			// 変数は使わないがDBにページを作成するために必要
			await createPage({
				slug: "c2",
				userId: user.id,
				parentId: self.id,
			});
			await createPage({
				slug: "gc1",
				userId: user.id,
				parentId: c1.id,
			});

			const revalidated: string[] = [];
			const revalidateSpy = (path: string) => void revalidated.push(path);

			// When
			await revalidatePageTreeAllLocales(self.id, revalidateSpy);

			// Then
			const targets = [
				"/user/u/page/self",
				"/user/u/page/p1",
				"/user/u/page/p2",
				"/user/u/page/c1",
				"/user/u/page/c2",
				"/user/u/page/gc1",
			];
			const expected = targets.length * (1 + supportedLocaleOptions.length);
			expect(revalidated.length).toBe(expected);
			for (const base of targets) {
				expect(revalidated).toContain(base);
				for (const { code } of supportedLocaleOptions.slice(0, 2)) {
					expect(revalidated).toContain(`/${code}${base}`);
				}
			}
		});
	});
});
