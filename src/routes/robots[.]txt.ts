import { createFileRoute } from "@tanstack/react-router";
import robots, { revalidate } from "@/app/robots";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: async () => {
				const data = await robots();
				return new Response(
					[
						`User-Agent: ${data.rules.userAgent}`,
						`Allow: ${data.rules.allow}`,
						"",
						...data.sitemap.map((url) => `Sitemap: ${url}`),
						"",
					].join("\n"),
					{
						headers: {
							"Cache-Control": `public, s-maxage=${revalidate}, stale-while-revalidate`,
							"Content-Type": "text/plain",
						},
					},
				);
			},
		},
	},
});
