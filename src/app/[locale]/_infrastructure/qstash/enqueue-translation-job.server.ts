import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import type { TranslationJobForTranslationAPI } from "@/app/types/translation-job";
import { enqueueTranslate } from "./enqueue-translate.server";

/** 翻訳ジョブを作成・キューに追加 */
export async function enqueueTranslationJob({
	currentUserId,
	pageId,
	targetLocales,
	aiModel = "gemini-2.5-flash",
	pageCommentId = null,
	annotationContentId = null,
}: {
	currentUserId: string;
	pageId: number;
	targetLocales: string[];
	aiModel?: string;
	pageCommentId?: number | null;
	annotationContentId?: number | null;
}): Promise<TranslationJobForTranslationAPI[]> {
	return Promise.all(
		targetLocales.map(async (locale) => {
			const job = await createTranslationJob({
				userId: currentUserId,
				pageId,
				locale,
				aiModel,
			});

			await enqueueTranslate({
				translationJobId: job.id,
				aiModel: job.aiModel,
				userId: currentUserId,
				pageId,
				targetLocale: locale,
				pageCommentId,
				annotationContentId,
			});

			return job;
		}),
	);
}
