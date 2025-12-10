import { describe, expect, it } from "vitest";

import { fetchPageDetail } from "./fetch-page-detail.server";

// 実DBを使ったスモークテスト。スラッグは指定のものを利用する。
const TEST_SLUG = "0od00g8j0hud";
const TEST_LOCALE = "en";

describe("fetchPageDetail (integration, real DB)", () => {
	it("returns rows with best translations per segment", async () => {
		const rows = await fetchPageDetail(TEST_SLUG, TEST_LOCALE);
		console.log(rows);
		expect(rows).not.toBeNull();
		if (!rows) return;

		// フラット配列で返ることを確認
		expect(Array.isArray(rows)).toBe(true);
		expect(rows.length).toBeGreaterThan(0);

		// 全行が指定slugであること
		for (const row of rows) {
			expect(row.pageSlug).toBe(TEST_SLUG);
		}

		// セグメントIDがユニーク（各セグメントにつき最良翻訳1件のみ）
		const ids = rows.map((r) => r.segmentId);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
