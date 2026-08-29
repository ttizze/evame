import { createFileRoute } from "@tanstack/react-router";
import { getTranslationJobs } from "@/app/api/translation-jobs/handler";

export const Route = createFileRoute("/api/translation-jobs")({
	server: {
		handlers: {
			GET: ({ request }) => getTranslationJobs(request),
		},
	},
});
