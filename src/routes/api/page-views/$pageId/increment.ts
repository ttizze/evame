import { createFileRoute } from "@tanstack/react-router";
import { incrementPageView } from "@/app/api/page-views/[pageId]/increment/handler";

export const Route = createFileRoute("/api/page-views/$pageId/increment")({
	server: {
		handlers: {
			POST: ({ params }) => incrementPageView(params.pageId),
		},
	},
});
