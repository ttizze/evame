import { createFileRoute } from "@tanstack/react-router";
import { getOgImage } from "@/app/api/og/handler";

export const Route = createFileRoute("/api/og")({
	server: {
		handlers: {
			GET: ({ request }) => getOgImage(request),
		},
	},
});
