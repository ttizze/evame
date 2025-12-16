/**
 * ページリストクエリ用のヘルパー関数
 *
 * Kysely ORMを使用して、WHERE条件とORDER BY条件を構築する関数群
 */

import type { SelectQueryBuilder } from "kysely";
import { sql } from "kysely";
import { db } from "@/db";
import type { DB } from "@/db/types";
import type { PageOrderByInput, PageWhereInput } from "./types";

/**
 * WHERE条件をKyselyクエリに適用
 */
export function applyWhereCondition<O>(
	query: SelectQueryBuilder<DB, "pages", O>,
	where: PageWhereInput,
): SelectQueryBuilder<DB, "pages", O> {
	let q = query;

	if (where.status) {
		q = q.where("pages.status", "=", where.status);
	}

	if (where.userId) {
		q = q.where("pages.userId", "=", where.userId);
	}

	if (where.parentId === null) {
		q = q.where("pages.parentId", "is", null);
	} else if (where.parentId !== undefined) {
		q = q.where("pages.parentId", "=", where.parentId);
	}

	if (where.id?.in) {
		q = q.where("pages.id", "in", where.id.in);
	}

	return q;
}

/**
 * ORDER BY条件をKyselyクエリに適用
 */
export function applyOrderBy<O>(
	query: SelectQueryBuilder<DB, "pages", O>,
	orderBy?: PageOrderByInput | PageOrderByInput[],
): SelectQueryBuilder<DB, "pages", O> {
	if (!orderBy) {
		return query.orderBy("pages.createdAt", "desc");
	}

	const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
	let q = query;

	for (const order of orders) {
		if ("createdAt" in order) {
			q = q.orderBy(
				"pages.createdAt",
				order.createdAt === "desc" ? "desc" : "asc",
			);
		}

		if ("likePages" in order) {
			// サブクエリでいいね数を計算
			const direction = order.likePages._count === "desc" ? "desc" : "asc";
			q = q.orderBy(
				sql`(SELECT COUNT(*) FROM like_pages WHERE like_pages.page_id = pages.id)`,
				direction,
			);
		}

		if ("order" in order) {
			q = q.orderBy("pages.order", order.order === "desc" ? "desc" : "asc");
		}
	}

	return q;
}

/**
 * ページ基本情報を取得（ユーザー情報含む）
 */
export async function fetchPagesBasic(
	where: PageWhereInput,
	orderBy?: PageOrderByInput | PageOrderByInput[],
	limit?: number,
	offset?: number,
) {
	let query = db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.select([
			"pages.id",
			"pages.slug",
			"pages.createdAt",
			"pages.updatedAt",
			"pages.status",
			"pages.sourceLocale",
			"pages.parentId",
			"pages.order",
			"users.id as userId",
			"users.name as userName",
			"users.handle as userHandle",
			"users.image as userImage",
			"users.createdAt as userCreatedAt",
			"users.updatedAt as userUpdatedAt",
			"users.profile as userProfile",
			"users.twitterHandle as userTwitterHandle",
			"users.totalPoints as userTotalPoints",
			"users.isAi as userIsAI",
			"users.plan as userPlan",
		]);

	query = applyWhereCondition(query, where);
	query = applyOrderBy(query, orderBy);

	if (limit !== undefined) {
		query = query.limit(limit);
	}

	if (offset !== undefined) {
		query = query.offset(offset);
	}

	const results = await query.execute();

	return results.map((row) => ({
		id: row.id,
		slug: row.slug,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		status: row.status,
		sourceLocale: row.sourceLocale,
		parentId: row.parentId,
		order: row.order,
		user: {
			id: row.userId,
			name: row.userName,
			handle: row.userHandle,
			image: row.userImage,
			createdAt: row.userCreatedAt,
			updatedAt: row.userUpdatedAt,
			profile: row.userProfile,
			twitterHandle: row.userTwitterHandle,
			totalPoints: row.userTotalPoints,
			isAI: row.userIsAI,
			plan: row.userPlan,
		},
	}));
}

/**
 * ページの総数を取得
 */
export async function fetchPageCount(where: PageWhereInput): Promise<number> {
	let query = db
		.selectFrom("pages")
		.select(sql<number>`count(*)::int`.as("count"));

	query = applyWhereCondition(query, where);

	const result = await query.executeTakeFirst();
	return Number(result?.count ?? 0);
}

/**
 * セグメントと翻訳のクエリ結果を、セグメントごとにグループ化して最良の翻訳を1件のみ選択
 */
export function buildSegmentsMap(
	rows: Array<{
		segment: {
			id: number;
			contentId: number;
			number: number;
			text: string;
			textAndOccurrenceHash: string;
			createdAt: Date;
			segmentTypeId: number;
		};
		segmentType: {
			key: string;
			label: string;
		};
		translation: {
			id: number;
			segmentId: number;
			userId: string;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
		} | null;
		translationUser: {
			id: string;
			name: string;
			handle: string;
			image: string;
			createdAt: Date;
			updatedAt: Date;
			profile: string;
			twitterHandle: string;
			totalPoints: number;
			isAI: boolean;
			plan: string;
		} | null;
	}>,
) {
	const segmentsMap = new Map<
		number,
		{
			id: number;
			contentId: number;
			number: number;
			text: string;
			textAndOccurrenceHash: string;
			createdAt: Date;
			segmentTypeId: number;
			segmentType: { key: string; label: string };
			segmentTranslation: {
				id: number;
				segmentId: number;
				userId: string;
				locale: string;
				text: string;
				point: number;
				createdAt: Date;
				user: {
					id: string;
					name: string;
					handle: string;
					image: string;
					createdAt: Date;
					updatedAt: Date;
					profile: string;
					twitterHandle: string;
					totalPoints: number;
					isAI: boolean;
					plan: string;
				};
			} | null;
		}
	>();

	for (const row of rows) {
		const segmentId = row.segment.id;

		if (!segmentsMap.has(segmentId)) {
			segmentsMap.set(segmentId, {
				...row.segment,
				segmentType: row.segmentType,
				segmentTranslation: null,
			});
		}

		// 最初の翻訳のみ追加（既にpoint DESC, createdAt DESCでソート済み）
		const segment = segmentsMap.get(segmentId);
		if (!segment) continue;

		if (
			row.translation?.id &&
			row.translationUser &&
			segment.segmentTranslation === null
		) {
			segment.segmentTranslation = {
				...row.translation,
				user: row.translationUser,
			};
		}
	}

	return segmentsMap;
}

/**
 * 複数ページのセグメントを取得（number: 0のみ、最良の翻訳1件のみ）
 *
 * 各セグメントに対して、point DESC, createdAt DESCでソートした最良の翻訳を1件のみ取得
 */
export async function fetchSegmentsForPages(pageIds: number[], locale: string) {
	if (pageIds.length === 0) return [];

	const allSegments = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin("segmentTranslations", (join) =>
			join
				.onRef("segments.id", "=", "segmentTranslations.segmentId")
				.on("segmentTranslations.locale", "=", locale),
		)
		.leftJoin("users", "segmentTranslations.userId", "users.id")
		.select([
			"segments.id as segmentId",
			"segments.contentId as segmentContentId",
			"segments.number as segmentNumber",
			"segments.text as segmentText",
			"segments.textAndOccurrenceHash as segmentTextAndOccurrenceHash",
			"segments.createdAt as segmentCreatedAt",
			"segments.segmentTypeId as segmentSegmentTypeId",
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
			"segmentTranslations.id as translationId",
			"segmentTranslations.segmentId as translationSegmentId",
			"segmentTranslations.userId as translationUserId",
			"segmentTranslations.locale as translationLocale",
			"segmentTranslations.text as translationText",
			"segmentTranslations.point as translationPoint",
			"segmentTranslations.createdAt as translationCreatedAt",
			"users.id as userId",
			"users.name as userName",
			"users.handle as userHandle",
			"users.image as userImage",
			"users.createdAt as userCreatedAt",
			"users.updatedAt as userUpdatedAt",
			"users.profile as userProfile",
			"users.twitterHandle as userTwitterHandle",
			"users.totalPoints as userTotalPoints",
			"users.isAi as userIsAI",
			"users.plan as userPlan",
		])
		.where("segments.contentId", "in", pageIds)
		.where("segments.number", "=", 0)
		.orderBy("segments.id")
		.orderBy("segmentTranslations.point", "desc")
		.orderBy("segmentTranslations.createdAt", "desc")
		.execute();

	// buildSegmentsMap用にデータを変換
	const mappedSegments = allSegments.map((row) => ({
		segment: {
			id: row.segmentId,
			contentId: row.segmentContentId,
			number: row.segmentNumber,
			text: row.segmentText,
			textAndOccurrenceHash: row.segmentTextAndOccurrenceHash,
			createdAt: row.segmentCreatedAt,
			segmentTypeId: row.segmentSegmentTypeId,
		},
		segmentType: {
			key: row.segmentTypeKey,
			label: row.segmentTypeLabel,
		},
		translation: row.translationId
			? {
					id: row.translationId,
					segmentId: row.translationSegmentId!,
					userId: row.translationUserId!,
					locale: row.translationLocale!,
					text: row.translationText!,
					point: row.translationPoint!,
					createdAt: row.translationCreatedAt!,
				}
			: null,
		translationUser: row.userId
			? {
					id: row.userId,
					name: row.userName!,
					handle: row.userHandle!,
					image: row.userImage!,
					createdAt: row.userCreatedAt!,
					updatedAt: row.userUpdatedAt!,
					profile: row.userProfile!,
					twitterHandle: row.userTwitterHandle!,
					totalPoints: row.userTotalPoints!,
					isAI: row.userIsAI!,
					plan: row.userPlan!,
				}
			: null,
	}));

	// セグメントごとにグループ化し、最良の翻訳を1件のみ選択
	const segmentsMap = buildSegmentsMap(mappedSegments);

	return Array.from(segmentsMap.values());
}

/**
 * 複数ページのタグを取得
 */
export async function fetchTagsForPages(pageIds: number[]) {
	if (pageIds.length === 0) return [];

	const result = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.select(["tagPages.pageId", "tags.id as tagId", "tags.name as tagName"])
		.where("tagPages.pageId", "in", pageIds)
		.execute();

	return result.map((row) => ({
		pageId: row.pageId,
		tag: {
			id: row.tagId,
			name: row.tagName,
		},
	}));
}

/**
 * 複数ページのカウントを取得（pageComments数、children数）
 */
export async function fetchCountsForPages(pageIds: number[]) {
	if (pageIds.length === 0) return [];

	const result = await db
		.selectFrom("pages")
		.leftJoin(
			(eb) =>
				eb
					.selectFrom("pageComments")
					.select(["pageId", sql<number>`count(*)::int`.as("commentCount")])
					.where("isDeleted", "=", false)
					.groupBy("pageId")
					.as("commentsCount"),
			(join) => join.onRef("pages.id", "=", "commentsCount.pageId"),
		)
		.leftJoin(
			(eb) =>
				eb
					.selectFrom("pages as children")
					.select(["parentId", sql<number>`count(*)::int`.as("childrenCount")])
					.where("status", "=", "PUBLIC")
					.groupBy("parentId")
					.as("childrenCount"),
			(join) => join.onRef("pages.id", "=", "childrenCount.parentId"),
		)
		.select([
			"pages.id as pageId",
			sql<number>`COALESCE(comments_count.comment_count, 0)`.as(
				"pageCommentsCount",
			),
			sql<number>`COALESCE(children_count.children_count, 0)`.as(
				"childrenCount",
			),
		])
		.where("pages.id", "in", pageIds)
		.execute();

	return result.map((row) => ({
		pageId: row.pageId,
		pageComments: Number(row.pageCommentsCount),
		children: Number(row.childrenCount),
	}));
}

/**
 * セグメントテキストで検索する際のページIDを取得
 * セグメントのテキスト（number: 0のみ）で検索し、該当するページIDのリストを返す
 */
export async function searchPageIdsBySegmentText(
	query: string,
	additionalWhere?: PageWhereInput,
): Promise<number[]> {
	let baseQuery = db
		.selectFrom("segments")
		.select("contentId as pageId")
		.distinct()
		.where("number", "=", 0)
		.where("text", "ilike", `%${query}%`);

	if (additionalWhere) {
		baseQuery = baseQuery.where((eb) =>
			eb.exists(
				eb
					.selectFrom("pages")
					.select(sql`1`.as("one"))
					.whereRef("pages.id", "=", "segments.contentId")
					.$call((q) => {
						let subQ = q;
						if (additionalWhere.status) {
							subQ = subQ.where("pages.status", "=", additionalWhere.status);
						}
						if (additionalWhere.userId) {
							subQ = subQ.where("pages.userId", "=", additionalWhere.userId);
						}
						if (additionalWhere.parentId === null) {
							subQ = subQ.where("pages.parentId", "is", null);
						} else if (additionalWhere.parentId !== undefined) {
							subQ = subQ.where(
								"pages.parentId",
								"=",
								additionalWhere.parentId,
							);
						}
						return subQ;
					}),
			),
		);
	}

	const result = await baseQuery.execute();
	return result.map((r) => r.pageId);
}

/**
 * タグ名で検索する際のページIDを取得
 */
export async function searchPageIdsByTagName(
	tagName: string,
	additionalWhere?: PageWhereInput,
): Promise<number[]> {
	let baseQuery = db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.select("tagPages.pageId")
		.distinct()
		.where("tags.name", "=", tagName);

	if (additionalWhere) {
		baseQuery = baseQuery.where((eb) =>
			eb.exists(
				eb
					.selectFrom("pages")
					.select(sql`1`.as("one"))
					.whereRef("pages.id", "=", "tagPages.pageId")
					.$call((q) => {
						let subQ = q;
						if (additionalWhere.status) {
							subQ = subQ.where("pages.status", "=", additionalWhere.status);
						}
						if (additionalWhere.userId) {
							subQ = subQ.where("pages.userId", "=", additionalWhere.userId);
						}
						if (additionalWhere.parentId === null) {
							subQ = subQ.where("pages.parentId", "is", null);
						} else if (additionalWhere.parentId !== undefined) {
							subQ = subQ.where(
								"pages.parentId",
								"=",
								additionalWhere.parentId,
							);
						}
						return subQ;
					}),
			),
		);
	}

	const result = await baseQuery.execute();
	return result.map((r) => r.pageId);
}
