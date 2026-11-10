import { createFileRoute } from "@tanstack/react-router";
import { getAppLogin, postAppLogin } from "@/app/api/app/login/handler";

export const Route = createFileRoute("/api/app/login")({
	server: {
		handlers: {
			GET: ({ request }) => getAppLogin(request),
			POST: ({ request }) => postAppLogin(request),
		},
	},
});
