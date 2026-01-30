import { BASE_URL } from "@/app/_constants/base-url";

const SUPPORTED_LOCALES = ["en", "ja", "zh", "ko", "es"] as const;
const DEFAULT_LOCALE = "en";

type AlternatesConfig = {
	canonical: string;
	languages: Record<string, string>;
};

/**
 * Generate alternates config with canonical URL and hreflang tags including x-default
 */
export function buildAlternates(
	locale: string,
	path: string,
): AlternatesConfig {
	const normalizedPath = path === "/" ? "" : path;

	return {
		canonical: `${BASE_URL}/${locale}${normalizedPath}`,
		languages: {
			"x-default": `${BASE_URL}/${DEFAULT_LOCALE}${normalizedPath}`,
			...Object.fromEntries(
				SUPPORTED_LOCALES.map((loc) => [
					loc,
					`${BASE_URL}/${loc}${normalizedPath}`,
				]),
			),
		},
	};
}
