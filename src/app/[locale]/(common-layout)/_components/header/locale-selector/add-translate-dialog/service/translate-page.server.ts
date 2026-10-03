import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { fetchPageIdBySlug } from "@/app/[locale]/_db/page-utility-queries.server";
import { hasSegmentsForContentId } from "@/app/[locale]/_db/segment-exists.server";
import { enqueueTranslate } from "@/app/[locale]/_infrastructure/qstash/enqueue-translate.server";
import type { TranslationJobForToast } from "@/app/types/translation-job";

export async function translatePage({
	pageSlug,
	aiModel,
	locale,
	userId,
}: {
	pageSlug: string;
	aiModel: string;
	locale: string;
	userId: string;
}): Promise<
	| { success: true; jobs: TranslationJobForToast[] }
	| { success: false; message: string }
> {
	const page = await fetchPageIdBySlug(pageSlug);
	if (!page) return { success: false, message: "Page not found" };
	if (!(await hasSegmentsForContentId(page.id)))
		return { success: true, jobs: [] };
	const job = await createTranslationJob({
		userId,
		aiModel,
		locale,
		pageId: page.id,
	});
	await enqueueTranslate({
		translationJobId: job.id,
		aiModel,
		userId,
		targetLocale: locale,
		pageId: page.id,
		pageCommentId: null,
		translationContext: "",
	});
	return { success: true, jobs: [job] };
}
