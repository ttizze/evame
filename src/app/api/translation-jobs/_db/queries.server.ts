import { eq, inArray } from "drizzle-orm";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { db } from "@/drizzle";
import { pages, translationJobs, users } from "@/drizzle/schema";

/** 指定されたIDの翻訳ジョブを取得する */
export async function fetchTranslationJobsByIds(
	ids: number[],
): Promise<TranslationJobForToast[]> {
	const rows = await db
		.select({
			id: translationJobs.id,
			locale: translationJobs.locale,
			status: translationJobs.status,
			progress: translationJobs.progress,
			error: translationJobs.error,
			pageSlug: pages.slug,
			userHandle: users.handle,
		})
		.from(translationJobs)
		.innerJoin(pages, eq(translationJobs.pageId, pages.id))
		.innerJoin(users, eq(pages.userId, users.id))
		.where(inArray(translationJobs.id, ids));

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
