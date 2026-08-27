import { describe, expect, it } from "vitest";
import { getRootLanguage, ROOT_LANGUAGE, rootMetadata } from "./__root";

describe("アプリケーションのドキュメントメタデータ", () => {
	it("グローバルサービス名と英語の既定メタデータを使う", () => {
		expect(ROOT_LANGUAGE).toBe("en");
		expect(rootMetadata.title).toBe("Digital Buddhism");
		expect(rootMetadata.description).toMatch(
			/reading Buddhist scriptures|comparing translations/i,
		);
	});

	it("現在URLの先頭にある対応localeをhtml言語として返す", () => {
		expect(getRootLanguage("/ja")).toBe("ja");
		expect(getRootLanguage("/ja/tipitaka/dhammapada")).toBe("ja");
		expect(getRootLanguage("/pi/search?query=sutta")).toBe("pi");
	});

	it("localeでないURLは既定の英語に戻し、不正値をlangへ渡さない", () => {
		expect(getRootLanguage("/")).toBe("en");
		expect(getRootLanguage("/login")).toBe("en");
		expect(getRootLanguage("/xx/page")).toBe("en");
		expect(getRootLanguage("/jaevil/page")).toBe("en");
	});
});
