import type { TranslationJobForToast } from "@/app/types/translation-job";
import { db } from "@/db";

/** 指定されたIDの翻訳ジョブを取得する */
export async function fetchTranslationJobsByIds(
	ids: number[],
): Promise<TranslationJobForToast[]> {
	const rows = await db
		.selectFrom("translationJobs")
		.innerJoin("pages", "translationJobs.pageId", "pages.id")
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"translationJobs.id",
			"translationJobs.locale",
			"translationJobs.status",
			"translationJobs.progress",
			"translationJobs.error",
			"pages.slug as pageSlug",
			"users.handle as userHandle",
		])
		.where("translationJobs.id", "in", ids)
		.execute();

	const rowsTyped: TranslationJobForToast[] = rows.map((row) => ({
		id: row.id as number,
		locale: row.locale as string,
		status: row.status as string,
		progress: row.progress as number,
		error: row.error as string,
		page: {
			slug: row.pageSlug as string,
			user: {
				handle: row.userHandle as string,
			},
		},
	}));

	return rowsTyped;
}
