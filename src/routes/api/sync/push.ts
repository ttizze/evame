import { createFileRoute } from "@tanstack/react-router";
import { postSyncPush } from "@/app/api/sync/push/handler";

export const Route = createFileRoute("/api/sync/push")({
	server: {
		handlers: {
			POST: ({ request }) => postSyncPush(request),
		},
	},
});
