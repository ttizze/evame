import type { SqlExecutor } from "@/db/turso-types";
import type { SupportedLocale } from "@/domain/locales";
import { absoluteSiteUrl } from "./metadata";

export function scripturePath(locale: SupportedLocale, slug: string): string {
	return `/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`;
}

export async function listPublishedScriptureSlugs(
	db: Pick<SqlExecutor, "all">,
): Promise<string[]> {
	const rows = await db.all<{ slug: string }>(
		`SELECT slug
		 FROM scriptures
		 WHERE published_at IS NOT NULL
		 ORDER BY position, id`,
	);
	return rows.map((row) => row.slug);
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
	slugs: readonly string[];
}): string {
	const urls = [
		...input.locales.map((locale) =>
			absoluteSiteUrl(`/${locale}`, input.origin),
		),
		...input.slugs.flatMap((slug) =>
			input.locales.map((locale) =>
				absoluteSiteUrl(scripturePath(locale, slug), input.origin),
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
		`Sitemap: ${absoluteSiteUrl("/sitemap.xml", origin)}`,
		"",
	].join("\n");
}
