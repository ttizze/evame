import { BASE_URL } from "@/app/_constants/base-url";

interface BuildAlternateLocalesParams {
	page: { sourceLocale: string; slug: string; userHandle: string };
	translatedLocales: string[];
}

export function buildAlternateLocales({
	page,
	translatedLocales,
}: BuildAlternateLocalesParams): Record<string, string> {
	const buildUrl = (locale: string) =>
		`${BASE_URL}/${locale}/user/${page.userHandle}/page/${page.slug}`;

	const locales = new Set([page.sourceLocale, ...translatedLocales]);

	return Object.fromEntries(
		Array.from(locales).map((locale) => [locale, buildUrl(locale)]),
	);
}
