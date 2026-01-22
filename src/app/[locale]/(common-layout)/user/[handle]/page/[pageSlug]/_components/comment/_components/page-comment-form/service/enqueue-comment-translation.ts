import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import type { TranslationJobForTranslationAPI } from "@/app/types/translation-job";

/** コメント投稿時に翻訳ジョブを作成・キューに追加 */
export async function enqueueCommentTranslation({
	currentUserId,
	pageId,
	pageCommentId,
	targetLocales,
	aiModel,
}: {
	currentUserId: string;
	pageId: number;
	pageCommentId: number;
	targetLocales: string[];
	aiModel: string;
}): Promise<TranslationJobForTranslationAPI[]> {
	return enqueueTranslationJob({
		currentUserId,
		pageId,
		targetLocales,
		aiModel,
		pageCommentId,
		translationContext: "",
	});
}
