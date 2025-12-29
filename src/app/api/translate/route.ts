import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePageForLocale } from "@/lib/revalidate-utils";
import { orchestrateTranslation } from "./_service/orchestrate-translation.server";
import { withQstashVerification } from "./_utils/with-qstash-signature";

const ParamsSchema = z.object({
	userId: z.string().min(1),
	pageId: z.number().int().positive(),
	translationJobId: z.number().int().positive(),
	aiModel: z.string().min(1),
	targetLocale: z.string().min(1),
	pageCommentId: z.number().int().positive().nullable(),
	annotationContentId: z.number().int().positive().nullable(),
});

async function handler(req: Request) {
	try {
		const params = ParamsSchema.parse(await req.json());
		const result = await orchestrateTranslation(params);

		if (result.shouldRevalidate) {
			await revalidatePageForLocale(params.pageId, params.targetLocale);
		}

		return NextResponse.json({ ok: result.ok }, { status: 201 });
	} catch (error) {
		console.error("/api/translate error:", error);
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

export const POST = withQstashVerification(handler);
