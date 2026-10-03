import { BASE_URL } from "@/app/_constants/base-url";
import {
	countPublicPages,
	fetchPagesWithUserAndTranslationChunk,
	fetchPopularTags,
} from "@/app/_db/sitemap-queries.server";

const CHUNK = 1_000;

export const SITEMAP_REVALIDATE = 3600;

export async function getSitemapChunkCount() {
	const total = await countPublicPages();
	return Math.max(1, Math.ceil(total / CHUNK));
}

export async function generateSitemapEntries(id: number) {
	const pages = await fetchPagesWithUserAndTranslationChunk({
		limit: CHUNK,
		offset: id * CHUNK,
	});

	const supportedLocales = ["en", "ja", "zh", "ko", "es"] as const;
	const defaultLocale = "en";

	const staticPaths = ["/", "/search", "/about", "/new-pages"];
	const staticRoutes = staticPaths.map((route) => ({
		url: `${BASE_URL}/${defaultLocale}${route === "/" ? "" : route}`,
		lastModified: new Date(),
		changeFrequency: "monthly" as const,
		priority: route === "/" ? 1 : 0.8,
		alternates: {
			languages: Object.fromEntries(
				supportedLocales.map((locale) => [
					locale,
					`${BASE_URL}/${locale}${route === "/" ? "" : route}`,
				]),
			),
		},
	}));

	const popularTags = await fetchPopularTags(50);
	const tagRoutes = popularTags.map((tagName) => ({
		url: `${BASE_URL}/${defaultLocale}/tag/${encodeURIComponent(tagName)}`,
		lastModified: new Date(),
		changeFrequency: "weekly" as const,
		priority: 0.6,
		alternates: {
			languages: Object.fromEntries(
				supportedLocales.map((locale) => [
					locale,
					`${BASE_URL}/${locale}/tag/${encodeURIComponent(tagName)}`,
				]),
			),
		},
	}));

	const pageRoutes = pages.map((page) => ({
		url: `${BASE_URL}/${page.sourceLocale}/${page.user.handle}/${page.slug}`,
		lastModified: new Date(page.updatedAt),
		changeFrequency: "daily" as const,
		priority: 0.7,
		alternates: {
			languages: Object.fromEntries(
				page.translationJobs.map((job) => [
					job.locale,
					`${BASE_URL}/${job.locale}/${page.user.handle}/${page.slug}`,
				]),
			),
		},
	}));

	return id === 0 ? [...staticRoutes, ...tagRoutes, ...pageRoutes] : pageRoutes;
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function serializeSitemap(
	entries: Awaited<ReturnType<typeof generateSitemapEntries>>,
): string {
	const urls = entries
		.map((entry) => {
			const alternates = Object.entries(entry.alternates.languages).map(
				([locale, url]) =>
					`<xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${escapeXml(url)}" />`,
			);
			return [
				"<url>",
				`<loc>${escapeXml(entry.url)}</loc>`,
				...alternates,
				`<lastmod>${entry.lastModified.toISOString()}</lastmod>`,
				`<changefreq>${entry.changeFrequency}</changefreq>`,
				`<priority>${entry.priority}</priority>`,
				"</url>",
			].join("\n");
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export async function generateSitemapResponse(id: number) {
	const entries = await generateSitemapEntries(id);
	return new Response(serializeSitemap(entries), {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE}, stale-while-revalidate=86400`,
		},
	});
}
