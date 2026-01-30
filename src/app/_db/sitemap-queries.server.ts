import { sql } from "kysely";
import { db } from "@/db";
import type { PageStatus, TranslationStatus } from "@/db/types";

export type PageWithUserAndTranslation = Awaited<
	ReturnType<typeof fetchPagesWithUserAndTranslationChunk>
>[number];

export async function countPublicPages() {
	const result = await db
		.selectFrom("pages")
		.select(sql<number>`count(*)::int`.as("count"))
		.where("status", "=", "PUBLIC" satisfies PageStatus)
		.executeTakeFirst();
	return Number(result?.count ?? 0);
}

export async function fetchPagesWithUserAndTranslationChunk({
	limit,
	offset,
}: {
	limit: number;
	offset: number;
}) {
	// まずページとユーザーを取得
	const pagesResult = await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"pages.slug",
			"pages.updatedAt",
			"pages.sourceLocale",
			"pages.id as pageId",
			"users.handle as userHandle",
		])
		.where("pages.status", "=", "PUBLIC" satisfies PageStatus)
		.limit(limit)
		.offset(offset)
		.execute();

	if (pagesResult.length === 0) {
		return [];
	}

	const pageIds = pagesResult.map((p) => p.pageId);

	// 各ページの翻訳ジョブを取得
	const translationJobsResult = await db
		.selectFrom("translationJobs")
		.select(["pageId", "locale"])
		.where("pageId", "in", pageIds.length > 0 ? pageIds : [-1])
		.where("status", "=", "COMPLETED" satisfies TranslationStatus)
		.execute();

	// ページIDごとに翻訳ジョブをグループ化
	const translationJobsMap = new Map<number, Array<{ locale: string }>>();
	for (const tj of translationJobsResult) {
		const existing = translationJobsMap.get(tj.pageId) || [];
		translationJobsMap.set(tj.pageId, [...existing, { locale: tj.locale }]);
	}

	// 結果を結合
	return pagesResult.map((page) => ({
		slug: page.slug,
		updatedAt: page.updatedAt,
		sourceLocale: page.sourceLocale,
		user: {
			handle: page.userHandle,
		},
		translationJobs: translationJobsMap.get(page.pageId) || [],
	}));
}

export async function fetchPopularTags(limit = 50): Promise<string[]> {
	const result = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.innerJoin("pages", "tagPages.pageId", "pages.id")
		.select(["tags.name"])
		.select(sql<number>`count(*)::int`.as("count"))
		.where("pages.status", "=", "PUBLIC" satisfies PageStatus)
		.groupBy("tags.name")
		.orderBy("count", "desc")
		.limit(limit)
		.execute();

	return result.map((r) => r.name);
}
