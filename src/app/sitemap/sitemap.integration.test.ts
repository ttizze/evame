import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import sitemap, { generateSitemaps } from "./sitemap";

/**
 * sitemap.ts の基本テスト
 *
 * 大量ページ（1001件以上）でのチャンク分割テストは
 * ./sitemap-all.integration.test.ts を参照
 */

await setupDbPerFile(import.meta.url);

describe("sitemap生成", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	describe("generateSitemaps", () => {
		it("公開ページが0件の場合、最低1チャンクを返す", async () => {
			const chunks = await generateSitemaps();

			expect(chunks).toEqual([{ id: 0 }]);
		});

		it("DRAFTページはカウントされない", async () => {
			const user = await createUser();
			await createPage({ userId: user.id, slug: "draft", status: "DRAFT" });
			await createPage({ userId: user.id, slug: "public", status: "PUBLIC" });

			const chunks = await generateSitemaps();

			// 公開ページ1件 → 1チャンク
			expect(chunks).toEqual([{ id: 0 }]);
		});
	});

	describe("サイトマップエントリ生成", () => {
		it("公開ページのURLを正しいフォーマットで出力する", async () => {
			const user = await createUser({ handle: "alice" });
			await createPage({
				userId: user.id,
				slug: "my-page",
				status: "PUBLIC",
				sourceLocale: "ja",
			});

			const entries = await sitemap({ id: Promise.resolve(0) });

			const pageEntry = entries.find((e) =>
				e.url?.includes("/alice/my-page"),
			);
			expect(pageEntry).toBeTruthy();
			// URLの構造を検証（ドメインに依存しない）
			expect(pageEntry?.url).toMatch(/\/ja\/user\/alice\/page\/my-page$/);
		});

		it("id=0のチャンクには静的ルートが含まれる", async () => {
			const entries = await sitemap({ id: Promise.resolve(0) });

			const staticUrls = entries
				.filter((e) => e.priority === 1 || e.priority === 0.8)
				.map((e) => e.url);

			// URLの構造を検証
			expect(staticUrls.some((url) => url?.endsWith("/en"))).toBe(true);
			expect(staticUrls.some((url) => url?.endsWith("/en/search"))).toBe(true);
			expect(staticUrls.some((url) => url?.endsWith("/en/about"))).toBe(true);
		});
	});
});
