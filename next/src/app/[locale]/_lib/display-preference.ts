export type DisplayMode = "source-only" | "translation-only" | "bilingual";

export function decideFromLocales(
	userLocale: string,
	sourceLocale: string,
): DisplayMode {
	return userLocale === sourceLocale ? "source-only" : "translation-only";
}
