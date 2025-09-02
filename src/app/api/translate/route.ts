import { NextResponse } from "next/server";
import { BASE_URL } from "@/app/_constants/base-url";
import type {
	TranslateChunkParams,
	TranslateJobParams,
} from "@/app/api/translate/types";
import { prisma } from "@/lib/prisma";
import { revalidateAllLocales } from "@/lib/revalidate-utils";
import { updateTranslationJob } from "./_db/mutations.server";
import { splitNumberedElements } from "./_lib/split-numbered-elements.server";
import { withQstashVerification } from "./_lib/with-qstash-signature";

async function handler(req: Request) {
	try {
		const params = (await req.json()) as TranslateJobParams;

		// Mark job started
		await updateTranslationJob(params.translationJobId, "IN_PROGRESS", 0);

		const chunks = splitNumberedElements(
			[...params.numberedElements].sort((a, b) => a.number - b.number),
		);
		const totalChunks = chunks.length;

		// If there is nothing to translate, finalize immediately.
		if (totalChunks === 0) {
			await updateTranslationJob(params.translationJobId, "COMPLETED", 100);
			const page = await prisma.page.findFirst({
				where: { id: params.pageId },
				select: { slug: true, user: { select: { handle: true } } },
			});
			if (page) {
				revalidateAllLocales(`/user/${page.user.handle}/page/${page.slug}`);
			}
			return NextResponse.json({ ok: true }, { status: 201 });
		}

		// Publish each chunk as an individual QStash message to /api/translate/chunk
		const { Client } = await import("@upstash/qstash");
		const client = new Client({ token: process.env.QSTASH_TOKEN });
		const publishBaseUrl =
			process.env.QSTASH_PUBLISH_BASE_URL?.trim() || BASE_URL;

		await Promise.all(
			chunks.map((chunk, idx) => {
				const body: TranslateChunkParams = {
					translationJobId: params.translationJobId,
					provider: params.provider,
					aiModel: params.aiModel,
					userId: params.userId,
					targetLocale: params.targetLocale,
					title: params.title,
					pageId: params.pageId,
					pageCommentId: params.pageCommentId,
					numberedElements: chunk,
					totalChunks,
					chunkIndex: idx,
				};
				return client.publishJSON({
					url: `${publishBaseUrl}/api/translate/chunk`,
					body,
					deduplicationId: `translate-${params.translationJobId}-c${idx}`,
					retries: 5,
					retryDelay: "10000",
					timeout: 240,
				});
			}),
		);

		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (error) {
		console.error("/api/translate error:", error);
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}

export const POST = withQstashVerification(handler);
