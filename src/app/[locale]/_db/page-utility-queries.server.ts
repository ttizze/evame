import { sql } from "kysely";
import { db } from "@/db";

/**
 * ページの翻訳ジョブを取得（各localeの最新COMPLETEDのみ）
 */
export async function fetchCompletedTranslationJobs(pageId: number) {
	return await db
		.selectFrom("translationJobs")
		.selectAll()
		.where(
			"id",
			"in",
			db
				.selectFrom(
					db
						.selectFrom("translationJobs")
						.select([
							"id",
							sql<number>`row_number() over (partition by locale order by created_at desc, id desc)`.as(
								"jobRank",
							),
						])
						.where("pageId", "=", pageId)
						.where("status", "=", "COMPLETED")
						.as("rankedJobs"),
				)
				.select("id")
				.where("jobRank", "=", 1),
		)
		.orderBy("locale")
		.execute();
}

/**
 * slugからページIDを取得
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
 */
export async function fetchPageViewCount(pageId: number): Promise<number> {
	const result = await db
		.selectFrom("pageViews")
		.select("count")
		.where("pageId", "=", pageId)
		.executeTakeFirst();
	return result?.count ?? 0;
}
