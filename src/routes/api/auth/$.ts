import { createFileRoute } from "@tanstack/react-router";
import { handleAuthRequest } from "@/auth/handler";
import { getAuth } from "@/auth/runtime";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) =>
				handleAuthRequest(request, getAuth()),
			POST: ({ request }: { request: Request }) =>
				handleAuthRequest(request, getAuth()),
		},
	},
});
