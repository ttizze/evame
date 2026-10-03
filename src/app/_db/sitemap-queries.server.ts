import { sql } from "kysely";
import {
	TIPITAKA_ROOT_SLUG,
	TIPITAKA_SYSTEM_USER_HANDLE,
} from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { db } from "@/db";
import type { PageStatus, TranslationStatus } from "@/db/types";

export type PageWithUserAndTranslation = Awaited<
	ReturnType<typeof fetchPagesWithUserAndTranslationChunk>
>[number];

function buildPublicSitemapPagesQuery() {
	return db
		.withRecursive("tipitakaPages", (qb) =>
			qb
				.selectFrom("pages")
				.innerJoin("contents", "contents.id", "pages.id")
				.innerJoin("users", "users.id", "pages.userId")
				.select([
					"pages.id",
					"pages.parentId",
					"pages.publishedAt",
					"pages.status",
				])
				.where("pages.slug", "=", TIPITAKA_ROOT_SLUG)
				.where("pages.parentId", "is", null)
				.where("contents.kind", "=", "PAGE")
				.where("users.handle", "=", TIPITAKA_SYSTEM_USER_HANDLE)
				.unionAll(
					qb
						.selectFrom("pages")
						.innerJoin("contents", "contents.id", "pages.id")
						.innerJoin("tipitakaPages", "pages.parentId", "tipitakaPages.id")
						.select([
							"pages.id",
							"pages.parentId",
							"pages.publishedAt",
							"pages.status",
						])
						.where("contents.kind", "=", "PAGE"),
				),
		)
		.withRecursive("publicTipitakaPages", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "parentId"])
				.where("parentId", "is", null)
				.where((eb) =>
					eb.or([
						eb("status", "=", "PUBLIC"),
						eb.and([
							eb("status", "=", "ARCHIVE"),
							eb("publishedAt", "is not", null),
						]),
					]),
				)
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin(
							"publicTipitakaPages",
							"tipitakaPages.parentId",
							"publicTipitakaPages.id",
						)
						.select(["tipitakaPages.id", "tipitakaPages.parentId"])
						.where((eb) =>
							eb.or([
								eb("tipitakaPages.status", "=", "PUBLIC"),
								eb.and([
									eb("tipitakaPages.status", "=", "ARCHIVE"),
									eb("tipitakaPages.publishedAt", "is not", null),
								]),
							]),
						),
				),
		)
		.selectFrom("pages")
		.where((eb) =>
			eb.or([
				eb.and([
					eb("pages.status", "=", "PUBLIC" satisfies PageStatus),
					eb(
						"pages.id",
						"not in",
						eb.selectFrom("tipitakaPages").select("tipitakaPages.id"),
					),
				]),
				eb(
					"pages.id",
					"in",
					eb.selectFrom("publicTipitakaPages").select("publicTipitakaPages.id"),
				),
			]),
		);
}

export async function countPublicPages() {
	const result = await buildPublicSitemapPagesQuery()
		.select(sql<number>`count(*)::int`.as("count"))
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
	const pagesResult = await buildPublicSitemapPagesQuery()
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"pages.slug",
			"pages.updatedAt",
			"pages.sourceLocale",
			"pages.id as pageId",
			"users.handle as userHandle",
		])
		.orderBy("pages.id", "asc")
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
