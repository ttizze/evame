import { createFileRoute } from "@tanstack/react-router";
import { getPagesExport } from "@/app/api/export-pages/handler";

export const Route = createFileRoute("/api/export-pages")({
	server: { handlers: { GET: ({ request }) => getPagesExport(request) } },
});
