import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt } from "@/seo/sitemap";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: async ({ request }) =>
				new Response(buildRobotsTxt(new URL(request.url).origin), {
					headers: {
						"Cache-Control": "public, max-age=3600, s-maxage=3600",
						"Content-Type": "text/plain; charset=utf-8",
					},
				}),
		},
	},
});
