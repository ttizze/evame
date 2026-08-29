import { createFileRoute } from "@tanstack/react-router";
import { generateSitemapResponse } from "../../-seo-sitemap";

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

				return generateSitemapResponse(requestedId);
			},
		},
	},
});
