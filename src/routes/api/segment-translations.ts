import { createFileRoute } from "@tanstack/react-router";
import {
	deleteSegmentTranslation,
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
			DELETE: async ({ request }) =>
				(await deleteSegmentTranslation(request)).response,
		},
	},
});
