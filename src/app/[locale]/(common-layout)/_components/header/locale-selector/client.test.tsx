import { describe, expect, it } from "vitest";
import { replacePathLocale } from "./client";

describe("ヘッダーのlocale selector", () => {
	it("詳細ページではlocaleだけを置き換えてhandleとpageSlugを保持する", () => {
		expect(replacePathLocale("/ja/tipitaka/dhammapada-1", "es")).toBe(
			"/es/tipitaka/dhammapada-1",
		);
	});

	it("locale付き認証ページでも残りのパスを保持する", () => {
		expect(replacePathLocale("/en/auth/login", "ja")).toBe("/ja/auth/login");
	});

	it("localeがないパスは選択したlocaleのトップへ移動する", () => {
		expect(replacePathLocale("/", "ko")).toBe("/ko");
	});
});
