import type { MetaDescriptor } from "@tanstack/router-core";
import {
	isSupportedLocale,
	type SupportedLocale,
	supportedLocales,
} from "@/domain/locales";

export const SITE_NAME = "Digital Buddhism";
export const DEFAULT_SITE_ORIGIN = "http://localhost:5173";
export const DEFAULT_OG_IMAGE_PATH = "/bg-ogp.png";

type LocalizedHeadInput = {
	origin: string;
	locale: string;
	path: string;
	pathForLocale: (locale: SupportedLocale) => string;
	title: string;
	description: string;
	type?: "website" | "article";
	scriptureTitle?: string;
	imagePath?: string;
	indexable?: boolean;
};

function normalizedOrigin(origin: string): string {
	try {
		const url = new URL(origin);
		url.pathname = "/";
		url.search = "";
		url.hash = "";
		return url.toString().replace(/\/$/, "");
	} catch {
		return DEFAULT_SITE_ORIGIN;
	}
}

export function absoluteSiteUrl(path: string, origin: string): string {
	return new URL(path, `${normalizedOrigin(origin)}/`).toString();
}

function localizedAlternateLinks(
	origin: string,
	pathForLocale: (locale: SupportedLocale) => string,
) {
	return [
		...supportedLocales.map(({ code }) => ({
			rel: "alternate" as const,
			hrefLang: code,
			href: absoluteSiteUrl(pathForLocale(code), origin),
		})),
		{
			rel: "alternate" as const,
			hrefLang: "x-default",
			href: absoluteSiteUrl(pathForLocale("en"), origin),
		},
	];
}

function structuredData(
	input: LocalizedHeadInput,
	locale: SupportedLocale,
	origin: string,
	canonical: string,
) {
	const pageType = input.type === "article" ? "Article" : "CollectionPage";
	return {
		"@context": "https://schema.org",
		"@type": pageType,
		"@id": `${canonical}#webpage`,
		url: canonical,
		name: input.title,
		description: input.description,
		inLanguage: locale,
		isPartOf: {
			"@type": "WebSite",
			"@id": `${origin}/#website`,
			name: SITE_NAME,
			url: `${origin}/`,
		},
		...(input.type === "article"
			? {
					headline: input.title,
					...(input.scriptureTitle
						? {
								about: {
									"@type": "CreativeWork",
									name: input.scriptureTitle,
								},
							}
						: {}),
				}
			: {}),
	};
}

export function buildLocalizedHead(input: LocalizedHeadInput) {
	const locale = isSupportedLocale(input.locale) ? input.locale : "en";
	const origin = normalizedOrigin(input.origin);
	const canonical = absoluteSiteUrl(input.path, origin);
	const image = absoluteSiteUrl(
		input.imagePath ?? DEFAULT_OG_IMAGE_PATH,
		origin,
	);

	const meta = [
		{ title: input.title },
		{ name: "description", content: input.description },
		{
			name: "robots",
			content: input.indexable === false ? "noindex,nofollow" : "index,follow",
		},
		{ property: "og:type", content: input.type ?? "website" },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:title", content: input.title },
		{ property: "og:description", content: input.description },
		{ property: "og:url", content: canonical },
		{ property: "og:locale", content: locale },
		{ property: "og:image", content: image },
		{ property: "og:image:alt", content: SITE_NAME },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: input.title },
		{ name: "twitter:description", content: input.description },
		{ name: "twitter:image", content: image },
		{
			"script:ld+json": structuredData(input, locale, origin, canonical),
		},
	] satisfies MetaDescriptor[];

	return {
		meta,
		links: [
			{ rel: "canonical", href: canonical },
			...localizedAlternateLinks(origin, input.pathForLocale),
		],
	};
}
