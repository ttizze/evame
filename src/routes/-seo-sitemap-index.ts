import { BASE_URL } from "@/app/_constants/base-url";
import { getSitemapChunkCount } from "./-seo-sitemap";

const SITEMAP_INDEX_CACHE_CONTROL =
	"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export async function generateSitemapIndexResponse() {
	const chunks = await getSitemapChunkCount();
	const sitemapItems = Array.from({ length: chunks }, (_, id) => {
		return `<sitemap>
      <loc>${BASE_URL}/sitemap/sitemap/${id}.xml</loc>
    </sitemap>`;
	}).join("");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemapItems}
    </sitemapindex>`;

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": SITEMAP_INDEX_CACHE_CONTROL,
		},
	});
}
