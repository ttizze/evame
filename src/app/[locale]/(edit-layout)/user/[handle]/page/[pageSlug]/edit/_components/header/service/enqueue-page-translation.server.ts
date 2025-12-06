import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { enqueueTranslate } from "@/app/[locale]/_infrastructure/qstash/enqueue-translate.server";
import type { TranslationJobForTranslationAPI } from "@/app/types/translation-job";

/** ページ公開時に翻訳ジョブを作成・キューに追加 */
export async function enqueuePageTranslation({
	currentUserId,
	pageId,
	targetLocales,
}: {
	currentUserId: string;
	pageId: number;
	targetLocales: string[];
}): Promise<TranslationJobForTranslationAPI[]> {
	return Promise.all(
		targetLocales.map(async (locale) => {
			const job = await createTranslationJob({
				userId: currentUserId,
				pageId,
				locale,
				aiModel: "gemini-2.0-flash",
			});

			await enqueueTranslate({
				translationJobId: job.id,
				provider: "vertex",
				aiModel: job.aiModel,
				userId: currentUserId,
				pageId,
				targetLocale: locale,
				pageCommentId: null,
				annotationContentId: null,
			});

			return job;
		}),
	);
}
