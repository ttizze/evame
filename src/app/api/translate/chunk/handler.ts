import { createServerLogger } from "@/app/_service/logger.server";
import type { TranslateChunkParams } from "../types";
import {
	incrementTranslationProgress,
	markJobFailed,
} from "./_db/mutations.server";
import { translateChunk } from "./_service/translate-chunk.server";
import { formatErrorMessage } from "./_utils/format-error-message";
import { stepForChunk } from "./_utils/progress";

const logger = createServerLogger("translate-chunk-route");

export async function postTranslateChunk(request: Request): Promise<{
	response: Response;
	completedPageId: number | undefined;
}> {
	let params: TranslateChunkParams | null = null;
	try {
		params = (await request.json()) as TranslateChunkParams;

		await translateChunk(
			params.userId,
			params.aiModel,
			params.segments,
			params.targetLocale,
			params.pageId,
			params.title,
			params.translationContext,
		);

		// Atomically increment progress based on this chunk's share
		const inc = stepForChunk(params.totalChunks, params.chunkIndex);
		const updated = await incrementTranslationProgress(
			params.translationJobId,
			inc,
		);

		return {
			response: Response.json({ ok: true }),
			completedPageId:
				updated && updated.status === "COMPLETED" ? params.pageId : undefined,
		};
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

		return {
			response: Response.json({ ok: false }, { status: 500 }),
			completedPageId: undefined,
		};
	}
}
