import { createFileRoute } from "@tanstack/react-router";
import { postReaderAction } from "@/app/api/reader-actions/handler";

export const Route = createFileRoute("/api/reader-actions")({
	server: { handlers: { POST: ({ request }) => postReaderAction(request) } },
});
