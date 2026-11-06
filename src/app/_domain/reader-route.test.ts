import { describe, expect, it } from "vitest";
import { parseReaderRoute } from "./reader-route";

describe("Astroで表示する公開ルート", () => {
	it.each(["/ja", "/ja/", "/ja.html", "/ja/index.html"])(
		"%sは記事一覧のトップとして扱う",
		(path) =>
			expect(parseReaderRoute(path, "")).toEqual({
				kind: "home",
				locale: "ja",
			}),
	);
	it("記事URLとコメントのページ番号を取得する", () => {
		expect(parseReaderRoute("/ja/author/article", "?page=2&view=both")).toEqual(
			{
				kind: "article",
				locale: "ja",
				handle: "author",
				pageSlug: "article",
				page: 2,
			},
		);
	});
	it.each(["-1", "0", "1.5", "invalid", "999999999999999999999"])(
		"ページ番号%sは先頭ページに戻す",
		(page) =>
			expect(parseReaderRoute("/ja/new-pages", `?page=${page}`)).toEqual({
				kind: "new",
				locale: "ja",
				page: 1,
			}),
	);
	it("著者の一覧では人気順・新着順とページ番号を維持する", () => {
		expect(parseReaderRoute("/en/author", "?sort=new&page=3")).toEqual({
			kind: "profile",
			locale: "en",
			handle: "author",
			sort: "new",
			page: 3,
		});
	});
	it("日本語のタグ名を復元する", () => {
		expect(parseReaderRoute("/ja/tag/%E6%97%A5%E8%A8%98", "")).toEqual({
			kind: "tag",
			locale: "ja",
			tagName: "日記",
			page: 1,
		});
	});
	it.each([
		"/api/reader-data",
		"/ja/auth/login",
		"/ja/author/article/edit",
		"/ja/author/edit",
		"/ja/author/page-management",
		"/ja/maintenance",
		"/xx",
		"/ja/%FF",
		"/ja/%2Fhidden",
		"/ja.html/author",
		"/ja//",
	])("%sを公開ページとして転送しない", (path) =>
		expect(parseReaderRoute(path, "")).toBeNull(),
	);
});
