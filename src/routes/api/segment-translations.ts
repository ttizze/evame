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
			POST: async ({ request }) => {
				const result = await postSegmentTranslation(request);
				return result.response;
			},
			PATCH: async ({ request }) => {
				const result = await patchSegmentTranslationVote(request);
				return result.response;
			},
			DELETE: async ({ request }) => {
				const result = await deleteSegmentTranslation(request);
				return result.response;
			},
		},
	},
});
