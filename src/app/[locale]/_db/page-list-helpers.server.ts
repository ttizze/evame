/**
 * ページリストクエリ用のヘルパー関数
 *
 * Drizzle ORMを使用して、WHERE条件とORDER BY条件を構築する関数群
 */

import type { SQL } from "drizzle-orm";
import {
	and,
	asc,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	isNull,
	sql,
} from "drizzle-orm";
import { db } from "@/drizzle";
import {
	likePages,
	pageComments,
	pages,
	segments,
	segmentTranslations,
	segmentTypes,
	tagPages,
	tags,
	users,
} from "@/drizzle/schema";
import type { PageOrderByInput, PageWhereInput } from "./types";

/**
 * WHERE条件をDrizzle SQLに変換
 */
export function buildWhereCondition(where: PageWhereInput): SQL | undefined {
	const conditions: SQL[] = [];

	if (where.status) {
		conditions.push(eq(pages.status, where.status));
	}

	if (where.userId) {
		conditions.push(eq(pages.userId, where.userId));
	}

	if (where.parentId === null) {
		conditions.push(isNull(pages.parentId));
	} else if (where.parentId !== undefined) {
		conditions.push(eq(pages.parentId, where.parentId));
	}

	if (where.id?.in) {
		conditions.push(inArray(pages.id, where.id.in));
	}

	return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * ORDER BY条件をDrizzle SQLに変換
 */
export function buildOrderBy(
	orderBy?: PageOrderByInput | PageOrderByInput[],
): SQL[] {
	if (!orderBy) {
		return [desc(pages.createdAt)];
	}

	const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
	const drizzleOrders: SQL[] = [];

	for (const order of orders) {
		if ("createdAt" in order) {
			drizzleOrders.push(
				order.createdAt === "desc"
					? desc(pages.createdAt)
					: asc(pages.createdAt),
			);
		}

		if ("likePages" in order) {
			const likeCount = sql<number>`(
        SELECT COUNT(*)::int
        FROM ${likePages}
        WHERE ${likePages.pageId} = ${pages.id}
      )`;
			drizzleOrders.push(
				order.likePages._count === "desc" ? desc(likeCount) : asc(likeCount),
			);
		}

		if ("order" in order) {
			drizzleOrders.push(
				order.order === "desc" ? desc(pages.order) : asc(pages.order),
			);
		}
	}

	return drizzleOrders.length > 0 ? drizzleOrders : [desc(pages.createdAt)];
}

/**
 * ユーザーフィールドのselectオブジェクト
 */
export const selectUserFieldsDrizzle = () => ({
	id: users.id,
	name: users.name,
	handle: users.handle,
	image: users.image,
	createdAt: users.createdAt,
	updatedAt: users.updatedAt,
	profile: users.profile,
	twitterHandle: users.twitterHandle,
	totalPoints: users.totalPoints,
	isAI: users.isAI,
	plan: users.plan,
});

/**
 * ページ基本情報を取得（ユーザー情報含む）
 */
export async function fetchPagesBasic(
	where: PageWhereInput,
	orderBy?: PageOrderByInput | PageOrderByInput[],
	limit?: number,
	offset?: number,
) {
	const whereCondition = buildWhereCondition(where);
	const orderByConditions = buildOrderBy(orderBy);

	const query = db
		.select({
			id: pages.id,
			slug: pages.slug,
			createdAt: pages.createdAt,
			status: pages.status,
			sourceLocale: pages.sourceLocale,
			parentId: pages.parentId,
			order: pages.order,
			user: selectUserFieldsDrizzle(),
		})
		.from(pages)
		.leftJoin(users, eq(pages.userId, users.id))
		.$dynamic();

	if (whereCondition) {
		query.where(whereCondition);
	}

	if (orderByConditions.length > 0) {
		query.orderBy(...orderByConditions);
	}

	if (limit !== undefined) {
		query.limit(limit);
	}

	if (offset !== undefined) {
		query.offset(offset);
	}

	return await query;
}

/**
 * ページの総数を取得
 */
export async function fetchPageCount(where: PageWhereInput): Promise<number> {
	const whereCondition = buildWhereCondition(where);

	const query = db
		.select({ count: sql<number>`count(*)::int` })
		.from(pages)
		.$dynamic();

	if (whereCondition) {
		query.where(whereCondition);
	}

	const result = await query;
	return Number(result[0]?.count ?? 0);
}

/**
 * 複数ページのセグメントを取得（number: 0のみ、最良の翻訳1件のみ）
 *
 * 各セグメントに対して、point DESC, createdAt DESCでソートした最良の翻訳を1件のみ取得
 */
export async function fetchSegmentsForPages(pageIds: number[], locale: string) {
	if (pageIds.length === 0) return [];

	const allSegments = await db
		.select({
			segment: {
				id: segments.id,
				contentId: segments.contentId,
				number: segments.number,
				text: segments.text,
			},
			segmentType: {
				key: segmentTypes.key,
				label: segmentTypes.label,
			},
			translation: {
				id: segmentTranslations.id,
				segmentId: segmentTranslations.segmentId,
				userId: segmentTranslations.userId,
				locale: segmentTranslations.locale,
				text: segmentTranslations.text,
				point: segmentTranslations.point,
				createdAt: segmentTranslations.createdAt,
			},
			translationUser: {
				id: users.id,
				name: users.name,
				handle: users.handle,
				image: users.image,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profile: users.profile,
				twitterHandle: users.twitterHandle,
				totalPoints: users.totalPoints,
				isAI: users.isAI,
				plan: users.plan,
			},
		})
		.from(segments)
		.innerJoin(segmentTypes, eq(segments.segmentTypeId, segmentTypes.id))
		.leftJoin(
			segmentTranslations,
			and(
				eq(segments.id, segmentTranslations.segmentId),
				eq(segmentTranslations.locale, locale),
			),
		)
		.leftJoin(users, eq(segmentTranslations.userId, users.id))
		.where(and(inArray(segments.contentId, pageIds), eq(segments.number, 0)))
		.orderBy(
			segments.id,
			desc(segmentTranslations.point),
			desc(segmentTranslations.createdAt),
		);

	// セグメントごとにグループ化し、最良の翻訳を1件のみ選択
	const segmentsMap = new Map<
		number,
		{
			id: number;
			contentId: number;
			number: number;
			text: string;
			segmentType: { key: string; label: string };
			segmentTranslations: Array<{
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
			}>;
		}
	>();

	for (const row of allSegments) {
		const segmentId = row.segment.id;

		if (!segmentsMap.has(segmentId)) {
			segmentsMap.set(segmentId, {
				...row.segment,
				segmentType: row.segmentType,
				segmentTranslations: [],
			});
		}

		// 最初の翻訳のみ追加（既にpoint DESC, createdAt DESCでソート済み）
		const segment = segmentsMap.get(segmentId);
		if (!segment) continue;

		if (
			row.translation?.id &&
			row.translationUser &&
			segment.segmentTranslations.length === 0
		) {
			segment.segmentTranslations.push({
				...row.translation,
				user: row.translationUser,
			});
		}
	}

	return Array.from(segmentsMap.values());
}

/**
 * 複数ページのタグを取得
 */
export async function fetchTagsForPages(pageIds: number[]) {
	if (pageIds.length === 0) return [];

	const result = await db
		.select({
			pageId: tagPages.pageId,
			tag: {
				id: tags.id,
				name: tags.name,
			},
		})
		.from(tagPages)
		.innerJoin(tags, eq(tagPages.tagId, tags.id))
		.where(inArray(tagPages.pageId, pageIds));

	return result;
}

/**
 * 複数ページのカウントを取得（pageComments数、children数）
 */
export async function fetchCountsForPages(pageIds: number[]) {
	if (pageIds.length === 0) return [];

	// inArrayを使う方が型安全
	const result = await db
		.select({
			pageId: pages.id,
			pageCommentsCount: sql<number>`COALESCE((
        SELECT COUNT(*)::int
        FROM ${pageComments} pc
        WHERE pc.page_id = ${pages.id}
          AND pc.is_deleted = false
      ), 0)`,
			childrenCount: sql<number>`COALESCE((
        SELECT COUNT(*)::int
        FROM ${pages} children
        WHERE children.parent_id = ${pages.id}
          AND children.status = 'PUBLIC'
      ), 0)`,
		})
		.from(pages)
		.where(inArray(pages.id, pageIds));

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
	const conditions = [
		eq(segments.number, 0),
		ilike(segments.text, `%${query}%`),
	];

	const pageWhereCondition = additionalWhere
		? buildWhereCondition(additionalWhere)
		: undefined;

	const segmentCondition = pageWhereCondition
		? and(
				...conditions,
				exists(
					db
						.select()
						.from(pages)
						.where(and(eq(pages.id, segments.contentId), pageWhereCondition)),
				),
			)
		: and(...conditions);

	const result = await db
		.selectDistinct({ pageId: segments.contentId })
		.from(segments)
		.where(segmentCondition);

	return result.map((r) => r.pageId);
}

/**
 * タグ名で検索する際のページIDを取得
 */
export async function searchPageIdsByTagName(
	tagName: string,
	additionalWhere?: PageWhereInput,
): Promise<number[]> {
	const conditions = [eq(tags.name, tagName)];

	const pageWhereCondition = additionalWhere
		? buildWhereCondition(additionalWhere)
		: undefined;

	const tagCondition = pageWhereCondition
		? and(
				...conditions,
				exists(
					db
						.select()
						.from(pages)
						.where(and(eq(pages.id, tagPages.pageId), pageWhereCondition)),
				),
			)
		: and(...conditions);

	const result = await db
		.selectDistinct({ pageId: tagPages.pageId })
		.from(tagPages)
		.innerJoin(tags, eq(tagPages.tagId, tags.id))
		.where(tagCondition);

	return result.map((r) => r.pageId);
}
