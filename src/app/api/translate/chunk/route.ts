import { createServerLogger } from "@/app/_service/logger.server";
import { revalidatePageForLocale } from "@/app/_service/revalidate-utils";
import { ApiErrors, apiSuccess } from "@/app/types/api-response";
import { withQstashVerification } from "../_utils/with-qstash-signature";
import type { TranslateChunkParams } from "../types";
import {
	incrementTranslationProgress,
	markJobFailed,
} from "./_db/mutations.server";
import { translateChunk } from "./_service/translate-chunk.server";
import { formatErrorMessage } from "./_utils/format-error-message";
import { stepForChunk } from "./_utils/progress";

const logger = createServerLogger("translate-chunk-route");

async function handler(req: Request) {
	let params: TranslateChunkParams | null = null;
	try {
		params = (await req.json()) as TranslateChunkParams;

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

		return apiSuccess({ ok: true });
	} catch (error) {
		const rawErrorMessage =
			error instanceof Error ? error.message : String(error);
		const userFriendlyMessage = formatErrorMessage(error);

		// paramsが取得できている場合のみエラーを保存
		if (params) {
			logger.error(
				{
					translationJobId: params.translationJobId,
					chunkIndex: params.chunkIndex,
					error_name: error instanceof Error ? error.name : "Unknown",
					error_message: rawErrorMessage,
				},
				"Translation chunk failed",
			);

			// ユーザー向けの簡潔なメッセージを保存
			await markJobFailed(params.translationJobId, 0, userFriendlyMessage);
		} else {
			// paramsが取得できなかった場合（リクエストボディのパースエラーなど）
			logger.error(
				{
					error_name: error instanceof Error ? error.name : "Unknown",
					error_message: rawErrorMessage,
				},
				"Translation chunk failed (params not available)",
			);
		}

		return ApiErrors.internal("Translation chunk failed");
	}
}

export const POST = withQstashVerification(handler);
