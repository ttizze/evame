import { getRequestConfig } from "next-intl/server";
import { supportedLocaleOptions } from "@/app/_constants/locale";

const messageLocales = ["en", "ja", "es", "ko", "zh"] as const;
const defaultLocale = "en";
const supportedLocales = supportedLocaleOptions.map((locale) => locale.code);

export default getRequestConfig(async ({ requestLocale }) => {
	let locale = await requestLocale;
	if (!locale || !supportedLocales.includes(locale)) {
		locale = defaultLocale;
	}
	const messageLocale = messageLocales.includes(
		locale as (typeof messageLocales)[number],
	)
		? locale
		: defaultLocale;
	return {
		locale,
		messages: (await import(`../../messages/${messageLocale}.json`)).default,
	};
});
