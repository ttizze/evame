import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";

/**
 * ページの翻訳ジョブを取得（各localeの最新COMPLETEDのみ）
 */
export async function fetchCompletedTranslationJobs(pageId: number) {
	"use cache";
	cacheLife("max");
	cacheTag(`page-translation-jobs:${pageId}`);

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
