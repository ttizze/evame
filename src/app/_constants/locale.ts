export type LocaleOption = {
	code: string;
	name: string;
};
export const supportedLocaleOptions: LocaleOption[] = [
	// ─── Core 10 ──────────────────────────────────────────────
	{ code: "en", name: "English" }, // 25.9 %
	{ code: "zh", name: "中文" }, // 19.4 %
	{ code: "es", name: "Español" }, // 7.9  %
	{ code: "ar", name: "العربية" }, // 5.2  %
	{ code: "id", name: "Bahasa Indonesia" }, // 4.3  %
	{ code: "pt", name: "Português" }, // 3.7  %
	{ code: "fr", name: "Français" }, // 3.3  %
	{ code: "ja", name: "日本語" }, // 2.6  %
	{ code: "ru", name: "Русский" }, // 2.5  %
	{ code: "de", name: "Deutsch" }, // 2.0  %

	// ─── Plus 10 ──────────────────────────────────────────────
	{ code: "vi", name: "Tiếng Việt" }, // ~1.8 %
	{ code: "ko", name: "한국어" }, // ~1.7 %
	{ code: "tr", name: "Türkçe" }, // ~1.6 %
	{ code: "it", name: "Italiano" }, // ~1.3 %
	{ code: "fa", name: "فارسی" }, // ~1.2 %
	{ code: "th", name: "ไทย" }, // ~1.1 %
	{ code: "pl", name: "Polski" }, // ~1.0 %
	{ code: "nl", name: "Nederlands" }, // ~0.9 %
	{ code: "tl", name: "Filipino" }, // ~0.9 %
	{ code: "hi", name: "हिन्दी" }, // ~0.8 %
	{ code: "pi", name: "pali" },
];
