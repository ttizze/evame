import { enqueueTranslationJob } from "@/app/[locale]/_infrastructure/qstash/enqueue-translation-job.server";
import type { TranslationJobForTranslationAPI } from "@/app/types/translation-job";

/** ページ公開時に翻訳ジョブを作成・キューに追加 */
export async function enqueuePageTranslation({
	currentUserId,
	pageId,
	targetLocales,
	aiModel,
}: {
	currentUserId: string;
	pageId: number;
	targetLocales: string[];
	aiModel: string;
}): Promise<TranslationJobForTranslationAPI[]> {
	return enqueueTranslationJob({
		currentUserId,
		pageId,
		targetLocales,
		aiModel,
	});
}
