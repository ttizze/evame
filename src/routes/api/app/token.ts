import { createFileRoute } from "@tanstack/react-router";
import { deleteAppToken, postAppToken } from "@/app/api/app/token/handler";

export const Route = createFileRoute("/api/app/token")({
	server: {
		handlers: {
			POST: ({ request }) => postAppToken(request),
			DELETE: ({ request }) => deleteAppToken(request),
		},
	},
});
