import { createFileRoute } from "@tanstack/react-router";
import { getReaderState } from "@/app/api/reader-state/handler";

export const Route = createFileRoute("/api/reader-state")({
	server: { handlers: { GET: ({ request }) => getReaderState(request) } },
});
