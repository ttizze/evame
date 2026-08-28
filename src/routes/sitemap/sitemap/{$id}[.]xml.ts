import { createFileRoute } from "@tanstack/react-router";
import sitemap, { revalidate } from "@/app/sitemap/sitemap";

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function serializeSitemap(
	entries: Awaited<ReturnType<typeof sitemap>>,
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

export const Route = createFileRoute("/sitemap/sitemap/{$id}.xml")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const requestedId = Number(params.id);
				if (
					!/^(0|[1-9]\d*)$/.test(params.id) ||
					!Number.isSafeInteger(requestedId)
				) {
					return new Response("Not Found", { status: 404 });
				}

				const entries = await sitemap({
					id: Promise.resolve(requestedId),
				});
				return new Response(serializeSitemap(entries), {
					headers: {
						"Content-Type": "application/xml",
						"Cache-Control": `public, max-age=0, s-maxage=${revalidate}, stale-while-revalidate=86400`,
					},
				});
			},
		},
	},
});
