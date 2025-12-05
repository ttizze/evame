import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import robots from "./robots";

/**
 * robots.ts の基本テスト
 *
 * 大量ページ（2001件以上）でのチャンク分割テストは
 * ./sitemap/sitemap-all.integration.test.ts を参照
 */

await setupDbPerFile(import.meta.url);

describe("robots.txt生成", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("公開ページが0件でも最低1つのサイトマップURLを出力する", async () => {
		const result = await robots();

		expect(result.sitemap).toHaveLength(1);
		expect(result.sitemap?.[0]).toMatch(/\/sitemap\/sitemap\/0\.xml$/);
	});

	it("DRAFTページはサイトマップのチャンク数に影響しない", async () => {
		const user = await createUser();
		await createPage({ userId: user.id, slug: "draft", status: "DRAFT" });

		const result = await robots();

		// DRAFTはカウントされないので1チャンク
		expect(result.sitemap).toHaveLength(1);
	});

	it("rulesにallow: /が設定されている", async () => {
		const result = await robots();

		expect(result.rules).toEqual({
			userAgent: "*",
			allow: "/",
		});
	});
});
