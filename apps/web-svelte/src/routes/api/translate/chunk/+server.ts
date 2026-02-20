import { json, type RequestHandler } from "@sveltejs/kit";
import {
	incrementTranslationProgress,
	markJobFailed,
} from "@/app/api/translate/chunk/_db/mutations.server";
import { translateChunk } from "@/app/api/translate/chunk/_service/translate-chunk.server";
import { formatErrorMessage } from "@/app/api/translate/chunk/_utils/format-error-message";
import { stepForChunk } from "@/app/api/translate/chunk/_utils/progress";
import type { TranslateChunkParams } from "@/app/api/translate/types";
import { purgeCacheTags } from "$lib/server/cloudflare-cache";
import { verifyQstashRequest } from "$lib/server/qstash-signature";

export const POST: RequestHandler = async ({ request }) => {
	let bodyText = "";
	try {
		bodyText = await verifyQstashRequest(request);
	} catch (error) {
		console.error("QStash signature verification failed", error);
		return json({ ok: false }, { status: 401 });
	}

	let params: TranslateChunkParams | null = null;
	try {
		params = JSON.parse(bodyText) as TranslateChunkParams;

		await translateChunk(
			params.userId,
			params.aiModel,
			params.segments,
			params.targetLocale,
			params.pageId,
			params.title,
			params.translationContext,
		);

		const inc = stepForChunk(params.totalChunks, params.chunkIndex);
		const updated = await incrementTranslationProgress(
			params.translationJobId,
			inc,
		);

		if (updated && updated.status === "COMPLETED") {
			try {
				await purgeCacheTags([
					`page:${params.pageId}`,
					`page-translation-jobs:${params.pageId}`,
				]);
			} catch (error) {
				console.error("Cloudflare cache purge failed", error);
			}
		}

		return json({ ok: true });
	} catch (error) {
		const rawErrorMessage =
			error instanceof Error ? error.message : String(error);
		const userFriendlyMessage = formatErrorMessage(error);

		if (params) {
			console.error("Translation chunk failed", {
				translationJobId: params.translationJobId,
				chunkIndex: params.chunkIndex,
				error_name: error instanceof Error ? error.name : "Unknown",
				error_message: rawErrorMessage,
			});
			await markJobFailed(params.translationJobId, 0, userFriendlyMessage);
		} else {
			console.error("Translation chunk failed (params not available)", {
				error_name: error instanceof Error ? error.name : "Unknown",
				error_message: rawErrorMessage,
			});
		}

		return json({ ok: false }, { status: 500 });
	}
};
