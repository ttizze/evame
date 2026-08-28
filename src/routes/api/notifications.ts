import { createFileRoute } from "@tanstack/react-router";
import { getNotifications } from "@/app/api/notifications/handler";

export const Route = createFileRoute("/api/notifications")({
	server: {
		handlers: {
			GET: ({ request }) => getNotifications(request),
		},
	},
});
