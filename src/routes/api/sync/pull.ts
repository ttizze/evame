import { createFileRoute } from "@tanstack/react-router";
import { getSyncPull } from "@/app/api/sync/pull/handler";

export const Route = createFileRoute("/api/sync/pull")({
	server: {
		handlers: {
			GET: ({ request }) => getSyncPull(request),
		},
	},
});
