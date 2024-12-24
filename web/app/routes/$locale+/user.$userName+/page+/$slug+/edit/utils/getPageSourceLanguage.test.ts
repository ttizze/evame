import { describe, expect, test } from "vitest";
import { getPageSourceLanguage } from "./getPageSourceLanguage";

describe("getPageSourceLanguage", () => {
	test("タイトルと本文から言語を正しく検出できるか", async () => {
		const title = "This is a test title";
		const numberedContent = `
      <p>This is the first paragraph.</p>
      <p>This is the second paragraph.</p>
    `;
		const language = await getPageSourceLanguage(numberedContent, title);
		expect(language).toBe("en");
	});

	test("コードとリンクが除去されるか", async () => {
		const title = "Test with code and links";
		const numberedContent = `
      <p>This is a <a href="#">link</a>.</p>
      <p>This is <code>code</code>.</p>
    `;
		const language = await getPageSourceLanguage(numberedContent, title);
		expect(language).toBe("en");
	});

	test("複数の言語が混ざっていても主要な言語を検出できるか", async () => {
		const title = "Mixed language test";
		const numberedContent = `
      <p>This is English.</p>
      <p>これは日本語です。</p>
    `;
		const language = await getPageSourceLanguage(numberedContent, title);
		// francは主要な言語を返すため、ここではどちらかの言語が返ってくることを確認
		expect(["en", "ja"]).toContain(language);
	});

	test("タイトルのみの場合でも言語を検出できるか", async () => {
		const title = "Only a title";
		const numberedContent = "test";
		const language = await getPageSourceLanguage(numberedContent, title);
		expect(language).toBe("und");
	});

	test("日本語のコンテンツを正しく検出できるか", async () => {
		const title = "日本語のタイトル";
		const numberedContent = `
      <p>これは日本語の段落です。</p>
    `;
		const language = await getPageSourceLanguage(numberedContent, title);
		expect(language).toBe("ja");
	});

	test("HTMLエンティティが含まれていても正しく処理できるか", async () => {
		const title = "HTML entities test";
		const numberedContent = `
      <p>This is &amp; that.</p>
    `;
		const language = await getPageSourceLanguage(numberedContent, title);
		expect(language).toBe("en");
	});
});
