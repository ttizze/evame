/**
 * ページリストクエリ用のヘルパー関数
 *
 * Drizzle ORMを使用して、WHERE条件とORDER BY条件を構築する関数群
 */

import type { SQL } from "drizzle-orm";
import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	isNull,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
import {
	basePageFieldSelectDrizzle,
	selectSegmentWithTranslationDrizzle,
} from "./queries.server";
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
		.select(basePageFieldSelectDrizzle())
		.from(pages)
		.innerJoin(users, eq(pages.userId, users.id))
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
		.select(selectSegmentWithTranslationDrizzle())
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
	const segmentsMap = buildSegmentsMap(allSegments);

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

	// 子ページをカウントするためにpagesテーブルのエイリアスを作成
	const children = alias(pages, "children");

	// コメント数のサブクエリ（countにエイリアスを付けてサブクエリ参照を可能にする）
	const commentsCountSubquery = db
		.select({
			pageId: pageComments.pageId,
			count: count().as("comment_count"),
		})
		.from(pageComments)
		.where(eq(pageComments.isDeleted, false))
		.groupBy(pageComments.pageId)
		.as("comments_count");

	// 子ページ数のサブクエリ（countにエイリアスを付けてサブクエリ参照を可能にする）
	const childrenCountSubquery = db
		.select({
			parentId: children.parentId,
			count: count().as("children_count"),
		})
		.from(children)
		.where(eq(children.status, "PUBLIC"))
		.groupBy(children.parentId)
		.as("children_count");

	const result = await db
		.select({
			pageId: pages.id,
			// コメント数をLEFT JOINで取得
			pageCommentsCount: sql<number>`COALESCE(${commentsCountSubquery.count}, 0)`,
			// 子ページ数をLEFT JOINで取得
			childrenCount: sql<number>`COALESCE(${childrenCountSubquery.count}, 0)`,
		})
		.from(pages)
		.leftJoin(commentsCountSubquery, eq(pages.id, commentsCountSubquery.pageId))
		.leftJoin(
			childrenCountSubquery,
			eq(pages.id, childrenCountSubquery.parentId),
		)
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
