import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages, translationJobs, users } from "@/drizzle/schema";
import type { PageStatus, TranslationStatus } from "@/drizzle/types";

export type PageWithUserAndTranslation = Awaited<
	ReturnType<typeof fetchPagesWithUserAndTranslationChunk>
>[number];

export async function countPublicPages() {
	const result = await db
		.select({ count: count() })
		.from(pages)
		.where(eq(pages.status, "PUBLIC" satisfies PageStatus));
	return Number(result[0]?.count ?? 0);
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
		.select({
			slug: pages.slug,
			updatedAt: pages.updatedAt,
			sourceLocale: pages.sourceLocale,
			pageId: pages.id,
			userHandle: users.handle,
		})
		.from(pages)
		.innerJoin(users, eq(pages.userId, users.id))
		.where(eq(pages.status, "PUBLIC" satisfies PageStatus))
		.limit(limit)
		.offset(offset);

	if (pagesResult.length === 0) {
		return [];
	}

	const pageIds = pagesResult.map((p) => p.pageId);

	// 各ページの翻訳ジョブを取得
	const translationJobsResult = await db
		.select({
			pageId: translationJobs.pageId,
			locale: translationJobs.locale,
		})
		.from(translationJobs)
		.where(
			and(
				inArray(translationJobs.pageId, pageIds.length > 0 ? pageIds : [-1]),
				eq(translationJobs.status, "COMPLETED" satisfies TranslationStatus),
			),
		);

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
