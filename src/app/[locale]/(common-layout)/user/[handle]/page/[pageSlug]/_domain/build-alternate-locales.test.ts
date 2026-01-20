import { describe, expect, it } from "vitest";
import { BASE_URL } from "@/app/_constants/base-url";
import { buildAlternateLocales } from "./build-alternate-locales";

describe("buildAlternateLocales", () => {
	const page = { sourceLocale: "en", slug: "my-page", userHandle: "testuser" };

	it("重複するlocaleは1つにまとめられる", () => {
		const result = buildAlternateLocales({
			page,
			translatedLocales: ["ja", "ja"],
		});

		expect(result).toEqual({
			en: `${BASE_URL}/en/user/testuser/page/my-page`,
			ja: `${BASE_URL}/ja/user/testuser/page/my-page`,
		});
	});

	it("sourceLocaleが翻訳情報に含まれていなくても常に含まれる", () => {
		const result = buildAlternateLocales({
			page,
			translatedLocales: ["ja", "fr"],
		});

		expect(result).toEqual({
			en: `${BASE_URL}/en/user/testuser/page/my-page`,
			ja: `${BASE_URL}/ja/user/testuser/page/my-page`,
			fr: `${BASE_URL}/fr/user/testuser/page/my-page`,
		});
	});

	it("翻訳がない場合はsourceLocaleのみ", () => {
		const result = buildAlternateLocales({
			page,
			translatedLocales: [],
		});

		expect(result).toEqual({
			en: `${BASE_URL}/en/user/testuser/page/my-page`,
		});
	});
});
