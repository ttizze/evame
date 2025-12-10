import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages, pageViews, translationJobs } from "@/drizzle/schema";

/**
 * ページの翻訳ジョブを取得（各localeの最新COMPLETEDのみ）
 * Drizzleに移行済み
 */
export async function fetchTranslationJobs(pageId: number) {
	// DISTINCT ONを使用して各localeの最新レコードを取得
	return await db
		.selectDistinctOn([translationJobs.locale])
		.from(translationJobs)
		.where(
			and(
				eq(translationJobs.pageId, pageId),
				eq(translationJobs.status, "COMPLETED"),
			),
		)
		.orderBy(translationJobs.locale, desc(translationJobs.createdAt));
}

/**
 * slugからページIDを取得
 * Drizzleに移行済み
 */
export async function fetchPageIdBySlug(slug: string) {
	const result = await db
		.select({ id: pages.id })
		.from(pages)
		.where(eq(pages.slug, slug))
		.limit(1);
	return result[0] ?? null;
}

/**
 * ページの閲覧数を取得
 * Drizzleに移行済み
 */
export async function fetchPageViewCount(pageId: number): Promise<number> {
	const result = await db
		.select({ count: pageViews.count })
		.from(pageViews)
		.where(eq(pageViews.pageId, pageId))
		.limit(1);
	return result[0]?.count ?? 0;
}

/**
 * 複数ページの閲覧数を一括取得
 * Drizzleに移行済み
 */
export async function fetchPageViewCounts(
	pageIds: number[],
): Promise<Record<number, number>> {
	if (pageIds.length === 0) return {};
	const views = await db
		.select({
			pageId: pageViews.pageId,
			count: pageViews.count,
		})
		.from(pageViews)
		.where(inArray(pageViews.pageId, pageIds));
	return views.reduce<Record<number, number>>((acc, v) => {
		acc[v.pageId] = v.count;
		return acc;
	}, {});
}
