import { NextResponse } from "next/server";
// We reuse translateChunk logic from ../_lib by calling the public translate()
// on a single chunk payload for simplicity. To avoid duplicating the chunk code,
// we keep the implementation in _lib and only handle progress and finalize here.
import { prisma } from "@/lib/prisma";
import { revalidateAllLocales } from "@/lib/revalidate-utils";
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

		const body = (await req.clone().json()) as TranslateChunkParams;
		await markJobFailed(body.translationJobId, 0);

		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

export const POST = withQstashVerification(handler);
