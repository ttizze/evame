import { createFileRoute } from "@tanstack/react-router";
import { getPageMarkdown } from "@/app/api/page-markdown/handler";

export const Route = createFileRoute("/api/page-markdown")({
	server: { handlers: { GET: ({ request }) => getPageMarkdown(request) } },
});
