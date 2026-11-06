import { describe, expect, it } from "vitest";
import { readerDocumentPath } from "./reader-document";

describe("生成済みHTMLのURL", () => {
	it.each(["/ja", "/ja/", "/ja/index.html", "/ja.html"])(
		"%sは同じトップのHTMLを使う",
		(path) => expect(readerDocumentPath(path, "?utm_source=test")).toBe("/ja"),
	);
	it("コメントの途中ページと原文表示を別のHTMLとして扱う", () => {
		expect(
			readerDocumentPath("/ja/author/article/", "?view=source&page=2"),
		).toBe("/ja/author/article?page=2&view=source");
	});
	it("著者一覧の新着順と翻訳表示を保持する", () => {
		expect(readerDocumentPath("/ja/author", "?view=user&sort=new&page=3")).toBe(
			"/ja/author?page=3&sort=new&view=user",
		);
	});
	it("無効な値と既定値は同じHTMLを使う", () => {
		expect(
			readerDocumentPath("/ja/author", "?page=-1&view=invalid&sort=popular"),
		).toBe("/ja/author");
	});
	it("日本語のタグ名を正規化する", () => {
		expect(readerDocumentPath("/ja/tag/日記", "?page=2")).toBe(
			"/ja/tag/%E6%97%A5%E8%A8%98?page=2",
		);
	});
	it.each([
		"/ja/search",
		"/ja/author/article/edit",
		"/api/reader-data",
		"/ja/%FF",
	])("%sは共有するHTMLの対象にしない", (path) =>
		expect(readerDocumentPath(path, "")).toBeNull(),
	);
});
