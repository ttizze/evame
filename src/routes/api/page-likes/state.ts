import { createFileRoute } from "@tanstack/react-router";
import { getPageLikeStates } from "@/app/api/page-likes/state/handler";

export const Route = createFileRoute("/api/page-likes/state")({
	server: {
		handlers: {
			GET: ({ request }) => getPageLikeStates(request),
		},
	},
});
