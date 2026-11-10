import { createFileRoute } from "@tanstack/react-router";
import { putAppDocumentStatus } from "@/app/api/app/document-status/handler";

export const Route = createFileRoute("/api/app/documents/$slug/status")({
	server: {
		handlers: {
			PUT: ({ request, params }) => putAppDocumentStatus(request, params.slug),
		},
	},
});
