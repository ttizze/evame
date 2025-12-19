import { NextResponse } from "next/server";
import { revalidatePageForLocale } from "@/lib/revalidate-utils";
import { withQstashVerification } from "../_utils/with-qstash-signature";
import type { TranslateChunkParams } from "../types";
import {
	incrementTranslationProgress,
	markJobFailed,
} from "./_db/mutations.server";
import { translateChunk } from "./_service/translate-chunk.server";
import { stepForChunk } from "./_utils/progress";

async function handler(req: Request) {
	try {
		const params = (await req.json()) as TranslateChunkParams;

		await translateChunk(
			params.userId,
			params.aiModel,
			params.segments,
			params.targetLocale,
			params.pageId,
			params.title,
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
