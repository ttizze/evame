import { createFileRoute } from "@tanstack/react-router";
import { supportedLocales } from "@/domain/locales";
import { buildSitemapXml, listPublishedScriptureSlugs } from "@/seo/sitemap";
import { getDatabase } from "@/server/runtime";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const origin = new URL(request.url).origin;
				const slugs = await listPublishedScriptureSlugs(getDatabase());
				return new Response(
					buildSitemapXml({
						origin,
						locales: supportedLocales.map(({ code }) => code),
						slugs,
					}),
					{
						headers: {
							"Cache-Control": "public, max-age=300, s-maxage=300",
							"Content-Type": "application/xml; charset=utf-8",
						},
					},
				);
			},
		},
	},
});
