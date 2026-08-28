import { createFileRoute } from "@tanstack/react-router";
import {
	getSegmentTranslations,
	patchSegmentTranslationVote,
	postSegmentTranslation,
} from "@/app/api/segment-translations/handler";

export const Route = createFileRoute("/api/segment-translations")({
	server: {
		handlers: {
			GET: ({ request }) => getSegmentTranslations(request),
			POST: async ({ request }) =>
				(await postSegmentTranslation(request)).response,
			PATCH: async ({ request }) =>
				(await patchSegmentTranslationVote(request)).response,
		},
	},
});
