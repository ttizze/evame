import { match } from "@formatjs/intl-localematcher";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	getRequestHeader,
	setCookie,
} from "@tanstack/react-start/server";
import { supportedLocaleOptions } from "@/app/_constants/locale";

const locales = supportedLocaleOptions.map((locale) => locale.code);
const defaultLocale = "en";

const getLocale = createServerFn({ method: "GET" }).handler(() => {
	const cookieLocale = getCookie("NEXT_LOCALE");
	if (cookieLocale && locales.includes(cookieLocale)) {
		return cookieLocale;
	}

	const requestedLocales = (getRequestHeader("accept-language") ?? "")
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
		// next-intl also falls back to the default locale for malformed headers.
	}

	if (cookieLocale !== undefined && cookieLocale !== locale) {
		setCookie("NEXT_LOCALE", locale, { sameSite: "lax" });
	}

	return locale;
});

export const Route = createFileRoute("/")({
	beforeLoad: async ({ location }) => {
		const locale = await getLocale();
		throw redirect({
			to: "/$locale",
			params: { locale },
			search: location.search,
		});
	},
});
