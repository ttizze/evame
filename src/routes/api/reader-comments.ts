import { createFileRoute } from "@tanstack/react-router";
import { getReaderComments } from "@/app/api/reader-comments/handler";

export const Route = createFileRoute("/api/reader-comments")({
	server: { handlers: { GET: ({ request }) => getReaderComments(request) } },
});
