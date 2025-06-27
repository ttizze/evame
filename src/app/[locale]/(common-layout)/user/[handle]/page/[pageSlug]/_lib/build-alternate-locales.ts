import type { TranslationJob } from "@prisma/client";
import { BASE_URL } from "@/app/_constants/base-url";

export function buildAlternateLocales(
	page: { sourceLocale: string; slug: string },
	translationJobs: TranslationJob[],
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
		...translationJobs.map((job) => [
			job.locale,
			`${BASE_URL}/${job.locale}/user/${userHandle}/page/${page.slug}`,
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
