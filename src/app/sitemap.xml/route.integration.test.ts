import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { GET } from "./route";

/**
 * sitemap.xml/route.ts の基本テスト
 *
 * 大量ページ（1001件以上）での複数サイトマップURL出力テストは
 * ../sitemap/sitemap-all.integration.test.ts を参照
 */

await setupDbPerFile(import.meta.url);

describe("/sitemap.xml ルート", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("公開ページが0件でも最低1つのサイトマップインデックスを出力する", async () => {
		const res = await GET();

		expect(res.headers.get("Content-Type")).toContain("application/xml");
		const xml = await res.text();
		expect(xml).toContain("<sitemapindex");
		expect(xml).toMatch(/\/sitemap\/sitemap\/0\.xml/);
	});

	it("XMLの形式が正しい", async () => {
		const res = await GET();
		const xml = await res.text();

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain(
			'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		);
		expect(xml).toContain("</sitemapindex>");
	});
});
