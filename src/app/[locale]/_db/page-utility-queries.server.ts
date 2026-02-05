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

/**
 * ページの閲覧数をまとめて取得
 */
export async function fetchPageViewCounts(pageIds: number[]) {
	const uniqueIds = Array.from(new Set(pageIds));
	const counts = new Map<number, number>();
	if (uniqueIds.length === 0) return counts;

	for (const id of uniqueIds) {
		counts.set(id, 0);
	}

	const rows = await db
		.selectFrom("pageViews")
		.select(["pageId", "count"])
		.where("pageId", "in", uniqueIds)
		.execute();

	for (const row of rows) {
		counts.set(row.pageId, row.count);
	}

	return counts;
}
