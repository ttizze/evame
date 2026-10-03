import { createFileRoute } from "@tanstack/react-router";
import { withQstashVerification } from "@/app/api/translate/_utils/with-qstash-signature";
import { postTranslateChunk } from "@/app/api/translate/chunk/handler";

const verifiedPostTranslateChunk = withQstashVerification(
	async (request) => (await postTranslateChunk(request)).response,
);

export const Route = createFileRoute("/api/translate/chunk")({
	server: {
		handlers: {
			POST: ({ request }) => verifiedPostTranslateChunk(request),
		},
	},
});
