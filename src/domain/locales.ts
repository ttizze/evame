/** UIの言語切替とserverのlocaleラベルで共有する対応言語の正本。 */
export const supportedLocales = [
	{ code: "en", label: "English" },
	{ code: "zh", label: "中文" },
	{ code: "es", label: "Español" },
	{ code: "ar", label: "العربية" },
	{ code: "id", label: "Bahasa Indonesia" },
	{ code: "pt", label: "Português" },
	{ code: "fr", label: "Français" },
	{ code: "ja", label: "日本語" },
	{ code: "ru", label: "Русский" },
	{ code: "de", label: "Deutsch" },
	{ code: "vi", label: "Tiếng Việt" },
	{ code: "ko", label: "한국어" },
	{ code: "tr", label: "Türkçe" },
	{ code: "it", label: "Italiano" },
	{ code: "fa", label: "فارسی" },
	{ code: "th", label: "ไทย" },
	{ code: "pl", label: "Polski" },
	{ code: "nl", label: "Nederlands" },
	{ code: "tl", label: "Filipino" },
	{ code: "hi", label: "हिन्दी" },
	{ code: "pi", label: "Pāli" },
] as const;

export type SupportedLocale = (typeof supportedLocales)[number]["code"];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
	return (
		typeof value === "string" &&
		supportedLocales.some((locale) => locale.code === value)
	);
}
