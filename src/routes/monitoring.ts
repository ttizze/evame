import { createFileRoute } from "@tanstack/react-router";
import { postMonitoring } from "@/app/api/monitoring/handler";

export const Route = createFileRoute("/monitoring")({
	server: {
		handlers: {
			POST: ({ request }) => postMonitoring(request),
		},
	},
});
