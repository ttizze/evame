import { supportedLocaleOptions } from "@/app/_constants/locale";

const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = supportedLocaleOptions.map(({ code }) => code);
const MAINTENANCE_ROUTE = new RegExp(
	`^/(?:(?:${SUPPORTED_LOCALES.join("|")})/)?maintenance/?$`,
	"i",
);
const MAINTENANCE_MATCHER =
	/^\/(?!api|_next|_vercel|privacy|terms|monitoring|sitemap(?:$|\/.*|\.xml)|.*\..*).*/;

export function shouldCheckMaintenance(pathname: string): boolean {
	return (
		MAINTENANCE_MATCHER.test(pathname) && !MAINTENANCE_ROUTE.test(pathname)
	);
}

export function getMaintenancePath({
	pathname,
	cookieHeader,
	acceptLanguage,
}: {
	pathname: string;
	cookieHeader: string | null;
	acceptLanguage: string | null;
}): string {
	return `/${resolveMaintenanceLocale({ pathname, cookieHeader, acceptLanguage })}/maintenance`;
}

export function resolveMaintenanceLocale({
	pathname,
	cookieHeader,
	acceptLanguage,
}: {
	pathname: string;
	cookieHeader: string | null;
	acceptLanguage: string | null;
}): string {
	const pathnameLocale = pathname.match(/^\/([^/]+)/)?.[1];
	const localeFromPathname = findSupportedLocale(pathnameLocale, false);
	if (localeFromPathname) return localeFromPathname;

	const localeFromCookie = findSupportedLocale(
		getLocaleCookie(cookieHeader),
		false,
	);
	if (localeFromCookie) return localeFromCookie;

	const localeFromHeader = getAcceptLanguageLocale(acceptLanguage);
	if (localeFromHeader) return localeFromHeader;

	return DEFAULT_LOCALE;
}

function findSupportedLocale(
	value: string | undefined,
	allowLanguageFallback = true,
): string | undefined {
	if (!value) return undefined;

	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "*") return undefined;

	const exactLocale = SUPPORTED_LOCALES.find(
		(locale) => locale.toLowerCase() === normalizedValue,
	);
	if (exactLocale || !allowLanguageFallback) return exactLocale;

	const language = normalizedValue.split("-")[0];
	return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === language);
}

function getLocaleCookie(cookieHeader: string | null): string | undefined {
	if (!cookieHeader) return undefined;

	for (const cookie of cookieHeader.split(";")) {
		const separatorIndex = cookie.indexOf("=");
		if (separatorIndex === -1) continue;
		if (cookie.slice(0, separatorIndex).trim() !== "NEXT_LOCALE") continue;

		const rawValue = cookie.slice(separatorIndex + 1).trim();
		const value = rawValue.replace(/^"|"$/g, "");
		try {
			return decodeURIComponent(value);
		} catch {
			return undefined;
		}
	}

	return undefined;
}

function getAcceptLanguageLocale(
	acceptLanguage: string | null,
): string | undefined {
	if (!acceptLanguage) return undefined;

	const candidates = acceptLanguage
		.split(",")
		.map((part, index) => {
			const [rawLocale, ...parameters] = part.trim().split(";");
			if (!rawLocale) return undefined;

			let quality = 1;
			for (const parameter of parameters) {
				const [name, rawValue] = parameter.trim().split("=", 2);
				if (name?.toLowerCase() !== "q") continue;
				const parsedQuality = Number(rawValue);
				if (!Number.isFinite(parsedQuality)) return undefined;
				quality = parsedQuality;
			}

			if (quality <= 0 || quality > 1) return undefined;
			return { locale: rawLocale, quality, index };
		})
		.filter((candidate) => candidate !== undefined)
		.sort((a, b) => b.quality - a.quality || a.index - b.index);

	for (const candidate of candidates) {
		const locale = findSupportedLocale(candidate.locale);
		if (locale) return locale;
	}

	return undefined;
}
