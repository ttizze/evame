import { createFileRoute } from "@tanstack/react-router";
import { GET as getSitemapIndex } from "@/app/sitemap.xml/route";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () => getSitemapIndex(),
		},
	},
});
