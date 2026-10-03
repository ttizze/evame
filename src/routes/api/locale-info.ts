import { createFileRoute } from "@tanstack/react-router";
import { getLocaleInfo } from "@/app/api/locale-info/handler";

export const Route = createFileRoute("/api/locale-info")({
	server: {
		handlers: {
			GET: ({ request }) => getLocaleInfo(request),
		},
	},
});
