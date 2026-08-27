import type { SqlExecutor } from "@/db/turso-types";
import { type SupportedLocale, supportedLocales } from "@/domain/locales";
import { absoluteSiteUrl } from "./metadata";

export function scripturePath(locale: SupportedLocale, slug: string): string {
	return `/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`;
}

export function legacyScripturePath(
	locale: SupportedLocale,
	handle: string,
	slug: string,
): string {
	return `/${encodeURIComponent(locale)}/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`;
}

export async function listPublishedScriptureSlugs(
	db: Pick<SqlExecutor, "all">,
): Promise<Array<{ handle: string; slug: string }>> {
	const rows = await db.all<{ handle: string; slug: string }>(
		`SELECT scriptures.slug, users.handle AS handle
		 FROM scriptures
		 INNER JOIN users ON users.id = scriptures.owner_user_id
		 WHERE scriptures.published_at IS NOT NULL
		 ORDER BY scriptures.position, scriptures.id`,
	);
	return rows;
}

function xmlEscape(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export function buildSitemapXml(input: {
	origin: string;
	locales: readonly SupportedLocale[];
	entries: ReadonlyArray<{ handle: string; slug: string }>;
}): string {
	const urls = [
		...input.locales.map((locale) =>
			absoluteSiteUrl(`/${locale}`, input.origin),
		),
		...input.entries.flatMap(({ handle, slug }) =>
			input.locales.map((locale) =>
				absoluteSiteUrl(
					legacyScripturePath(locale, handle, slug),
					input.origin,
				),
			),
		),
	];
	const body = urls
		.map((url) => `  <url>\n    <loc>${xmlEscape(url)}</loc>\n  </url>`)
		.join("\n");

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		body,
		"</urlset>",
		"",
	].join("\n");
}

export function buildRobotsTxt(origin: string): string {
	return [
		"User-agent: *",
		"Allow: /",
		"Disallow: /api/",
		"Disallow: /login",
		...supportedLocales.map(({ code }) => `Disallow: /${code}/auth/login`),
		`Sitemap: ${absoluteSiteUrl("/sitemap.xml", origin)}`,
		"",
	].join("\n");
}
