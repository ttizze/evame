import { createFileRoute } from "@tanstack/react-router";
import { getAppDocuments } from "@/app/api/app/documents/handler";

export const Route = createFileRoute("/api/app/documents")({
	server: { handlers: { GET: ({ request }) => getAppDocuments(request) } },
});
