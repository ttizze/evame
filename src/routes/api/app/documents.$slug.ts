import { createFileRoute } from "@tanstack/react-router";
import { putAppDocument } from "@/app/api/app/document/handler";

export const Route = createFileRoute("/api/app/documents/$slug")({
	server: {
		handlers: {
			PUT: ({ request, params }) => putAppDocument(request, params.slug),
		},
	},
});
