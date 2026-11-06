import { createFileRoute } from "@tanstack/react-router";
import { getReaderData } from "@/app/api/reader-data/handler";

export const Route = createFileRoute("/api/reader-data")({
	server: { handlers: { GET: ({ request }) => getReaderData(request) } },
});
