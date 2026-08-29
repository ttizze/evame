import { supportedLocaleOptions } from "@/app/_constants/locale";

export const routing = {
	locales: supportedLocaleOptions.map((locale) => locale.code),
	defaultLocale: "en",
} as const;
