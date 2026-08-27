import { describe, expect, it } from "vitest";
import { buildLoginHref, normalizeRedirectPath } from "./login-link";

describe("翻訳操作のログイン導線", () => {
	it("現在のlocaleと安全な戻り先をログインURLへ渡す", () => {
		expect(buildLoginHref("ja-JP", "/ja/dhammapada-1?mode=both")).toBe(
			"/login?locale=ja&redirect=%2Fja%2Fdhammapada-1%3Fmode%3Dboth",
		);
	});

	it("外部URLを戻り先として採用しない", () => {
		expect(normalizeRedirectPath("https://evil.example/steal")).toBe("/");
		expect(normalizeRedirectPath("//evil.example/steal")).toBe("/");
	});

	it("不正な戻り先の代わりに指定されたfallbackを使う", () => {
		expect(normalizeRedirectPath("javascript:alert(1)", "/en")).toBe("/en");
	});
});
