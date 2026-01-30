import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { orchestrateTranslation } from "./_service/orchestrate-translation.server";
import { withQstashVerification } from "./_utils/with-qstash-signature";

const logger = createServerLogger("translate-route");

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

async function handler(req: Request) {
	try {
		const params = ParamsSchema.parse(await req.json());
		logger.info(
			{ translationJobId: params.translationJobId, pageId: params.pageId },
			"Orchestration started",
		);
		const result = await orchestrateTranslation(params);

		return NextResponse.json({ ok: result.ok }, { status: 201 });
	} catch (error) {
		logger.error({ error }, "Orchestration failed");
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

export const POST = withQstashVerification(handler);
