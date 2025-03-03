// buildAlternateLocales.test.ts
import { BASE_URL } from "@/app/_constants/base-url";
import type { PageAITranslationInfo } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildAlternateLocales } from "./build-alternate-locales";

describe("buildAlternateLocales", () => {
	const userHandle = "testuser";
	const page = { sourceLocale: "en", slug: "my-page" };

	it("重複するlocaleは1つにまとめられる", () => {
		const result = buildAlternateLocales(
			page,
			[{ locale: "ja" }, { locale: "ja" }] as PageAITranslationInfo[],
			userHandle,
			"fr",
		);

		expect(result).toEqual({
			en: `${BASE_URL}/en/user/testuser/page/my-page`,
			ja: `${BASE_URL}/ja/user/testuser/page/my-page`,
		});
	});

	it("currentLocale の翻訳は常に除外される", () => {
		const pageAITranslationInfo = [
			{ locale: "fr" },
			{ locale: "en" },
		] as PageAITranslationInfo[];
		// currentLocale が "en" の場合、"en" の翻訳は除外され、かつ sourceLocale が存在するので追加されない
		const result = buildAlternateLocales(
			page,
			pageAITranslationInfo,
			userHandle,
			"en",
		);
		expect(result).toEqual({
			fr: `${BASE_URL}/fr/user/testuser/page/my-page`,
		});
	});

	it("sourceLocaleが翻訳情報に含まれていなくても常に含まれる", () => {
		const result = buildAlternateLocales(
			page,
			[{ locale: "ja" }, { locale: "fr" }] as PageAITranslationInfo[],
			userHandle,
			"de",
		);

		expect(result).toEqual({
			en: `${BASE_URL}/en/user/testuser/page/my-page`,
			ja: `${BASE_URL}/ja/user/testuser/page/my-page`,
			fr: `${BASE_URL}/fr/user/testuser/page/my-page`,
		});
	});
});
