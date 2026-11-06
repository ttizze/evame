import { supportedLocaleOptions } from "../_constants/locale";
import { CATEGORIES } from "../[locale]/(common-layout)/search/constants";

export function parseReaderPage(value: string | null) {
	const page = Number(value ?? 1);
	return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseReaderRoute(pathname: string, search: string) {
	let parts: string[];
	try {
		parts = pathname
			.replace(/\/$/, "")
			.split("/")
			.slice(1)
			.map(decodeURIComponent);
	} catch {
		return null;
	}
	const locale = parts[0]?.replace(/\.html$/, "");
	if (
		!locale ||
		!supportedLocaleOptions.some((option) => option.code === locale)
	)
		return null;
	const params = new URLSearchParams(search);
	const page = parseReaderPage(params.get("page"));
	if (parts.length === 1 || (parts.length === 2 && parts[1] === "index.html"))
		return { kind: "home" as const, locale };
	if (
		parts[0] !== locale ||
		parts.some((part) => !part || part.includes("/") || part.includes("\\"))
	)
		return null;
	if (parts.length === 2) {
		const name = parts[1];
		if (name === "about") return { kind: "about" as const, locale };
		if (name === "privacy") return { kind: "privacy" as const, locale };
		if (name === "terms") return { kind: "terms" as const, locale };
		if (name === "new-pages") return { kind: "new" as const, locale, page };
		if (name === "search") {
			const category =
				CATEGORIES.find((category) => category === params.get("category")) ??
				"title";
			return {
				kind: "search" as const,
				locale,
				page,
				category,
				query: params.get("query") ?? "",
				tagPage:
					params.get("tagPage") === "true"
						? ("true" as const)
						: ("false" as const),
			};
		}
		if (["auth", "maintenance", "tag"].includes(name)) return null;
		return {
			kind: "profile" as const,
			locale,
			handle: name,
			page,
			sort:
				params.get("sort") === "new" ? ("new" as const) : ("popular" as const),
		};
	}
	if (parts.length !== 3) return null;
	if (parts[1] === "tag")
		return { kind: "tag" as const, locale, tagName: parts[2], page };
	if (
		[
			"auth",
			"maintenance",
			"about",
			"new-pages",
			"search",
			"privacy",
			"terms",
		].includes(parts[1]) ||
		["edit", "page-management"].includes(parts[2])
	)
		return null;
	return {
		kind: "article" as const,
		locale,
		handle: parts[1],
		pageSlug: parts[2],
		page,
	};
}
