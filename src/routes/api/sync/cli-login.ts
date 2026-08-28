import { createFileRoute } from "@tanstack/react-router";
import { getSyncCliLogin } from "@/app/api/sync/cli-login/handler";

export const Route = createFileRoute("/api/sync/cli-login")({
	server: {
		handlers: {
			GET: ({ request }) => getSyncCliLogin(request),
		},
	},
});
