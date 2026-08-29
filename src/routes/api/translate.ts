import { createFileRoute } from "@tanstack/react-router";
import { withQstashVerification } from "@/app/api/translate/_utils/with-qstash-signature";
import { postTranslate } from "@/app/api/translate/handler";

const verifiedPostTranslate = withQstashVerification(postTranslate);

export const Route = createFileRoute("/api/translate")({
	server: {
		handlers: {
			POST: ({ request }) => verifiedPostTranslate(request),
		},
	},
});
