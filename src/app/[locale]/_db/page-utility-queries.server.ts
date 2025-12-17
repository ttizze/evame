import { db } from "@/db";

/**
 * ページの翻訳ジョブを取得（各localeの最新COMPLETEDのみ）
 * Kyselyに移行済み
 */
export async function fetchTranslationJobs(pageId: number) {
	// DISTINCT ONを使用して各localeの最新レコードを取得
	return await db
		.selectFrom("translationJobs")
		.selectAll()
		.distinctOn(["locale"])
		.where("pageId", "=", pageId)
		.where("status", "=", "COMPLETED")
		.orderBy("locale")
		.orderBy("createdAt", "desc")
		.execute();
}

/**
 * slugからページIDを取得
 * Kyselyに移行済み
 */
export async function fetchPageIdBySlug(slug: string) {
	const result = await db
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", slug)
		.executeTakeFirst();
	return result ?? null;
}

/**
 * ページの閲覧数を取得
 * Kyselyに移行済み
 */
export async function fetchPageViewCount(pageId: number): Promise<number> {
	const result = await db
		.selectFrom("pageViews")
		.select("count")
		.where("pageId", "=", pageId)
		.executeTakeFirst();
	return result?.count ?? 0;
}

/**
 * 複数ページの閲覧数を一括取得
 * Kyselyに移行済み
 */
export async function fetchPageViewCounts(
	pageIds: number[],
): Promise<Record<number, number>> {
	if (pageIds.length === 0) return {};
	const views = await db
		.selectFrom("pageViews")
		.select(["pageId", "count"])
		.where("pageId", "in", pageIds)
		.execute();
	return views.reduce<Record<number, number>>((acc, v) => {
		acc[v.pageId] = v.count;
		return acc;
	}, {});
}
