import { supportedLocaleOptions } from "~/constants/languages";
export const supportedLocalesCodes = supportedLocaleOptions.map(
	(locale) => locale.code,
);
export const fallbackLocale = "en";
export const defaultNS = "translation";

export const resources = supportedLocalesCodes.reduce(
	(acc, locale) => {
		try {
			const translations = require(`public/locales/${locale}.json`);
			acc[locale] = { translation: translations };
		} catch (error) {
			acc[locale] = { translation: {} };
		}
		return acc;
	},
	{} as Record<string, { translation: Record<string, string> }>,
);
