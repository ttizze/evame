import { BASE_URL } from "@/app/constants/base-url";
import type { PageAITranslationInfo } from "@prisma/client";

export function buildAlternateLocales(
	page: { sourceLocale: string; slug: string },
	pageAITranslationInfo: PageAITranslationInfo[],
	userHandle: string,
	currentLocale: string,
): Record<string, string> {
	const allLocales = [
		// sourceLocaleのエントリ
		[
			page.sourceLocale,
			`${BASE_URL}/${page.sourceLocale}/user/${userHandle}/page/${page.slug}`,
		],
		// 翻訳情報からのエントリ
		...pageAITranslationInfo.map((info) => [
			info.locale,
			`${BASE_URL}/${info.locale}/user/${userHandle}/page/${page.slug}`,
		]),
	];

	// 重複を除去し、現在のlocaleを除外
	return Object.fromEntries(
		Array.from(new Set(allLocales.map(([locale]) => locale)))
			.filter((locale) => locale !== currentLocale)
			.map((locale) => [
				locale,
				`${BASE_URL}/${locale}/user/${userHandle}/page/${page.slug}`,
			]),
	);
}
