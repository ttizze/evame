import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { orchestrateTranslation } from "@/app/api/translate/_service/orchestrate-translation.server";
import { verifyQstashRequest } from "$lib/server/qstash-signature";

const ParamsSchema = z.object({
	userId: z.string().min(1),
	pageId: z.number().int().positive(),
	translationJobId: z.number().int().positive(),
	aiModel: z.string().min(1),
	targetLocale: z.string().min(1),
	pageCommentId: z.number().int().positive().nullable(),
	annotationContentId: z.number().int().positive().nullable(),
	translationContext: z.string(),
});

export const POST: RequestHandler = async ({ request }) => {
	let bodyText = "";
	try {
		bodyText = await verifyQstashRequest(request);
	} catch (error) {
		console.error("QStash signature verification failed", error);
		return json({ ok: false }, { status: 401 });
	}

	try {
		const params = ParamsSchema.parse(JSON.parse(bodyText));
		const result = await orchestrateTranslation(params);
		return json({ ok: result.ok }, { status: 201 });
	} catch (error) {
		console.error("Orchestration failed", error);
		return json({ ok: false }, { status: 500 });
	}
};
