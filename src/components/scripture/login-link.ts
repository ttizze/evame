import { isSupportedLocale } from "@/domain/locales";

const DEFAULT_REDIRECT = "/";

function normalizedLocale(locale: string | undefined): string {
	const base = locale?.toLowerCase().split("-")[0];
	return isSupportedLocale(base) ? base : "en";
}

function isSafeRelativePath(value: string): boolean {
	return (
		value.startsWith("/") &&
		!value.startsWith("//") &&
		!value.includes("\\") &&
		[...value].every((character) => {
			const code = character.codePointAt(0) ?? 0;
			return code > 0x1f && code !== 0x7f;
		})
	);
}

export function normalizeRedirectPath(
	value: string | undefined,
	fallback = DEFAULT_REDIRECT,
): string {
	if (!value || !isSafeRelativePath(value)) {
		return fallback;
	}

	try {
		const url = new URL(value, "https://digital-buddhism.invalid");
		const path = `${url.pathname}${url.search}`;
		return path.startsWith("//") ? fallback : path;
	} catch {
		return fallback;
	}
}

export function buildLoginHref(
	locale: string | undefined,
	redirect: string | undefined,
): string {
	const next = encodeURIComponent(normalizeRedirectPath(redirect));
	return `/${normalizedLocale(locale)}/auth/login?next=${next}`;
}
