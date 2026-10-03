import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { orchestrateTranslation } from "./_service/orchestrate-translation.server";

const logger = createServerLogger("translate-route");

const ParamsSchema = z.object({
	userId: z.string().min(1),
	pageId: z.number().int().positive(),
	translationJobId: z.number().int().positive(),
	aiModel: z.string().min(1),
	targetLocale: z.string().min(1),
	annotationContentId: z.number().int().positive().nullable(),
	pageCommentId: z.number().int().positive().nullable(),
	translationContext: z.string(),
});

export async function postTranslate(request: Request): Promise<Response> {
	try {
		const params = ParamsSchema.parse(await request.json());
		logger.info(
			{ translationJobId: params.translationJobId, pageId: params.pageId },
			"Orchestration started",
		);
		const result = await orchestrateTranslation(params);

		return Response.json({ ok: result.ok }, { status: 201 });
	} catch (error) {
		logger.error({ error }, "Orchestration failed");
		return Response.json({ ok: false }, { status: 500 });
	}
}
