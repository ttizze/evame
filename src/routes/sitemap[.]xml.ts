import { createFileRoute } from "@tanstack/react-router";
import { generateSitemapIndexResponse } from "./-seo-sitemap-index";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () => generateSitemapIndexResponse(),
		},
	},
});
