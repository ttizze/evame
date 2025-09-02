import { NextResponse } from "next/server";
// We reuse translateChunk logic from ../_lib by calling the public translate()
// on a single chunk payload for simplicity. To avoid duplicating the chunk code,
// we keep the implementation in _lib and only handle progress and finalize here.
import { prisma } from "@/lib/prisma";
import { revalidateAllLocales } from "@/lib/revalidate-utils";
import {
	incrementTranslationProgress,
	updateTranslationJob,
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

		// If we just reached or exceeded 100, finalize the job and revalidate.
		if (updated.progress >= 100) {
			await updateTranslationJob(params.translationJobId, "COMPLETED", 100);

			const page = await prisma.page.findFirst({
				where: { id: params.pageId },
				select: { slug: true, user: { select: { handle: true } } },
			});
			if (page) {
				revalidateAllLocales(`/user/${page.user.handle}/page/${page.slug}`);
			}
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("/api/translate/chunk error:", error);
		// Mark the whole job as failed on any chunk failure
		try {
			const body = (await req.clone().json()) as TranslateChunkParams;
			await updateTranslationJob(body.translationJobId, "FAILED", 0);
		} catch {}
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

export const POST = withQstashVerification(handler);
