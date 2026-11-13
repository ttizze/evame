import { createFileRoute } from "@tanstack/react-router";
import { getReaderHeaderData } from "@/app/api/reader-header/handler";

export const Route = createFileRoute("/api/reader-header")({
	server: { handlers: { GET: ({ request }) => getReaderHeaderData(request) } },
});
