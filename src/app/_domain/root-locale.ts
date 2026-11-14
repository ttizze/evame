import { match } from "@formatjs/intl-localematcher";
import { supportedLocaleOptions } from "../_constants/locale";

const locales = supportedLocaleOptions.map((locale) => locale.code);
const defaultLocale = "en";
export function resolveRootLocale(
	cookieLocale: string | undefined,
	acceptLanguage: string | null,
) {
	if (cookieLocale && locales.includes(cookieLocale)) {
		return cookieLocale;
	}

	const requestedLocales = (acceptLanguage ?? "")
		.split(",")
		.map((value, index) => {
			const [tag, ...parameters] = value.trim().split(";");
			const quality = parameters.find((parameter) =>
				parameter.trim().startsWith("q="),
			);
			return {
				tag,
				quality: quality ? Number.parseFloat(quality.trim().slice(2)) : 1,
				index,
			};
		})
		.filter(({ tag, quality }) => tag && tag !== "*" && quality > 0)
		.sort(
			(left, right) => right.quality - left.quality || left.index - right.index,
		)
		.map(({ tag }) => tag);

	let locale = defaultLocale;
	try {
		const matchedLocale = match(
			requestedLocales,
			[...locales].sort((left, right) => right.length - left.length),
			defaultLocale,
		);
		locale =
			locales.find(
				(supportedLocale) =>
					supportedLocale.toLowerCase() === matchedLocale.toLowerCase(),
			) ?? defaultLocale;
	} catch {
		// malformed headers fall back to the default locale, matching the previous i18n behavior.
	}

	return locale;
}
