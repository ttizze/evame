import { NextResponse } from "next/server";
import { revalidatePageForLocale } from "@/lib/revalidate-utils";
import {
	incrementTranslationProgress,
	markJobFailed,
} from "../_db/mutations.server";
import { stepForChunk } from "../_lib/progress";
import { translateChunk } from "../_lib/translate.server";
import { withQstashVerification } from "../_lib/with-qstash-signature";
import type { TranslateChunkParams } from "../types";

async function handler(req: Request) {
	try {
		const params = (await req.json()) as TranslateChunkParams;

		await translateChunk(
			params.userId,
			params.provider,
			params.aiModel,
			params.numberedElements,
			params.targetLocale,
			params.pageId,
			params.title,
			params.pageCommentId,
		);

		// Atomically increment progress based on this chunk's share
		const inc = stepForChunk(params.totalChunks, params.chunkIndex);
		const updated = await incrementTranslationProgress(
			params.translationJobId,
			inc,
		);

		// If the job is completed, revalidate the page.
		if (updated && updated.status === "COMPLETED") {
			await revalidatePageForLocale(params.pageId, params.targetLocale);
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("/api/translate/chunk error:", error);

		const body = (await req.clone().json()) as TranslateChunkParams;
		await markJobFailed(body.translationJobId, 0);

		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

export const POST = withQstashVerification(handler);
