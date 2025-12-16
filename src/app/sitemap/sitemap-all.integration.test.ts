import { beforeAll, describe, expect, it } from "vitest";
import type { Users } from "@/db/types";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import robots from "../robots";
import { GET as getSitemapIndex } from "../sitemap.xml/route";
import sitemap, { generateSitemaps } from "./sitemap";

/**
 * 大量ページでのサイトマップ関連テスト（共有データセット）
 *
 * 1001件・2001件など大量データを作成するテストを集約し、
 * データ作成を1回だけ行うことで高速化しています。
 *
 * 各ルートの基本テストは以下のファイルを参照:
 * - src/app/sitemap/sitemap.integration.test.ts
 * - src/app/sitemap.xml/route.integration.test.ts
 * - src/app/robots.integration.test.ts
 */

await setupDbPerFile(import.meta.url);

describe("大量ページでのチャンク分割テスト", () => {
	describe("1001件（2チャンク）", () => {
		let user: Users;

		beforeAll(async () => {
			await resetDatabase();
			user = await createUser();
			const createPromises = Array.from({ length: 1001 }, (_, i) =>
				createPage({
					userId: user.id,
					slug: `page-${i}`,
					status: "PUBLIC",
				}),
			);
			await Promise.all(createPromises);
		});

		it("[sitemap.ts] generateSitemaps: 2チャンクに分割される", async () => {
			const chunks = await generateSitemaps();
			expect(chunks.map((c) => c.id)).toEqual([0, 1]);
		});

		it("[sitemap.ts] sitemap: id>0のチャンクには静的ルートが含まれない", async () => {
			const entries = await sitemap({ id: Promise.resolve(1) });
			const staticEntries = entries.filter(
				(e) => e.priority === 1 || e.priority === 0.8,
			);
			expect(staticEntries).toHaveLength(0);
		});

		it("[sitemap.xml/route.ts] 複数のサイトマップURLを含む", async () => {
			const res = await getSitemapIndex();
			const xml = await res.text();
			expect(xml).toMatch(/\/sitemap\/sitemap\/0\.xml/);
			expect(xml).toMatch(/\/sitemap\/sitemap\/1\.xml/);
		});
	});

	describe("2001件（3チャンク）", () => {
		beforeAll(async () => {
			await resetDatabase();
			const user = await createUser();
			const createPromises = Array.from({ length: 2001 }, (_, i) =>
				createPage({
					userId: user.id,
					slug: `page-${i}`,
					status: "PUBLIC",
				}),
			);
			await Promise.all(createPromises);
		});

		it("[robots.ts] 3つのサイトマップURLを出力する", async () => {
			const result = await robots();
			expect(result.sitemap).toHaveLength(3);
			expect(result.sitemap?.[0]).toMatch(/\/sitemap\/sitemap\/0\.xml$/);
			expect(result.sitemap?.[1]).toMatch(/\/sitemap\/sitemap\/1\.xml$/);
			expect(result.sitemap?.[2]).toMatch(/\/sitemap\/sitemap\/2\.xml$/);
		});
	});
});
