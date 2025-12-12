import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages, segments } from "@/drizzle/schema";
import type { PageForList, PageForTitle } from "../types";
import {
	fetchCountsForPages,
	fetchPageCount,
	fetchPagesBasic,
	fetchSegmentsForPages,
	fetchTagsForPages,
	searchPageIdsBySegmentText,
	searchPageIdsByTagName,
} from "./page-list-helpers.server";
import type { PageOrderByInput, PageWhereInput } from "./types";

type FetchListParams = {
	page?: number;
	pageSize?: number;
	pageOwnerId?: string;
	locale?: string;
};

/**
 * ページ取得・変換関数
 *
 * Drizzle ORMを使用してページリストを取得・変換する
 */
export async function fetchPagesWithTransform(
	where: PageWhereInput,
	skip: number,
	take: number,
	locale: string,
	orderBy?: PageOrderByInput | PageOrderByInput[],
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	// 1. 基本情報を取得
	const [pagesResult, total] = await Promise.all([
		fetchPagesBasic(where, orderBy, take, skip),
		fetchPageCount(where),
	]);

	if (pagesResult.length === 0) {
		return { pageForLists: [], total: 0 };
	}

	const pageIds = pagesResult.map((p) => p.id);

	// 2. 関連データを並列取得
	const [segmentsData, tagsData, countsData] = await Promise.all([
		fetchSegmentsForPages(pageIds, locale),
		fetchTagsForPages(pageIds),
		fetchCountsForPages(pageIds),
	]);

	// 3. データをマップに変換
	const segmentsMap = new Map<number, typeof segmentsData>();
	for (const segment of segmentsData) {
		const existing = segmentsMap.get(segment.contentId) || [];
		segmentsMap.set(segment.contentId, [...existing, segment]);
	}

	const tagsMap = new Map<number, typeof tagsData>();
	for (const tag of tagsData) {
		const existing = tagsMap.get(tag.pageId) || [];
		tagsMap.set(tag.pageId, [...existing, tag]);
	}

	const countsMap = new Map(countsData.map((c) => [c.pageId, c]));

	// 4. データを結合してPageForList型に変換
	const pageForLists: PageForList[] = pagesResult.map((page) => {
		const pageSegments = segmentsMap.get(page.id) || [];
		const pageTags = tagsMap.get(page.id) || [];
		const counts = countsMap.get(page.id) || {
			pageComments: 0,
			children: 0,
		};

		if (!page.user) {
			throw new Error(`User not found for page ${page.id}`);
		}
		console.log("counts", counts);
		return {
			id: page.id,
			slug: page.slug,
			createdAt: page.createdAt,
			updatedAt: page.updatedAt,
			status: page.status,
			sourceLocale: page.sourceLocale,
			parentId: page.parentId,
			order: page.order,
			user: page.user,
			content: {
				segments: pageSegments,
			},
			tagPages: pageTags.map((t) => ({ tag: t.tag })),
			_count: {
				pageComments: counts.pageComments,
				children: counts.children,
			},
		};
	});

	return {
		pageForLists,
		total,
	};
}

async function fetchPaginatedPublicPageListsWithOrderBy({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	locale = "en",
	orderBy,
}: FetchListParams & {
	orderBy: PageOrderByInput | PageOrderByInput[];
}): Promise<{
	pageForLists: PageForList[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	// 共通フィルタ
	const baseWhere: PageWhereInput = {
		status: "PUBLIC",
		parentId: null, // 親ページのみ表示（子ページは除外）
	};

	// 所有者のみ表示したい場合
	if (pageOwnerId) {
		baseWhere.userId = pageOwnerId;
	}

	const { pageForLists, total } = await fetchPagesWithTransform(
		baseWhere,
		skip,
		pageSize,
		locale,
		orderBy,
	);

	return {
		pageForLists,
		totalPages: Math.ceil(total / pageSize),
	};
}

export async function fetchPaginatedNewPageLists(params: FetchListParams) {
	return fetchPaginatedPublicPageListsWithOrderBy({
		...params,
		orderBy: { createdAt: "desc" },
	});
}

export async function fetchPaginatedPopularPageLists(params: FetchListParams) {
	return fetchPaginatedPublicPageListsWithOrderBy({
		...params,
		orderBy: [{ likePages: { _count: "desc" } }, { createdAt: "desc" }],
	});
}

/**
 * 子ページを取得
 * Drizzle版に移行済み
 *
 * 親ページIDで子ページを取得し、order順でソートして返す
 * PageForTitle型を返す（tagPagesは含まない、children countのみ）
 */
export async function fetchChildPages(
	parentId: number,
	locale: string,
): Promise<PageForTitle[]> {
	// fetchPagesWithTransformを使用してページを取得
	const { pageForLists } = await fetchPagesWithTransform(
		{
			parentId,
			status: "PUBLIC",
		},
		0,
		1000, // 子ページは通常それほど多くないので、十分大きな値を設定
		locale,
		{ order: "asc" },
	);

	// PageForListをPageForTitleに変換
	return pageForLists.map((page) => {
		const { tagPages: _tagPages, ...pageWithoutTags } = page;
		return {
			...pageWithoutTags,
			_count: {
				children: page._count.children,
			},
		};
	});
}

// ==================== 検索用関数 ====================

// 検索結果をページ情報に変換する共通処理
async function transformSearchResults(
	allPageIds: number[],
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	const total = allPageIds.length;
	const pageIds = allPageIds.slice(skip, skip + take);

	if (pageIds.length === 0) {
		return { pageForLists: [], total };
	}

	const { pageForLists } = await fetchPagesWithTransform(
		{
			id: { in: pageIds },
			status: "PUBLIC",
		},
		0,
		pageIds.length,
		locale,
	);

	const pageMap = new Map(pageForLists.map((p: PageForList) => [p.id, p]));
	const orderedPageForLists = pageIds
		.map((id: number) => pageMap.get(id))
		.filter((p): p is PageForList => p !== undefined);

	return {
		pageForLists: orderedPageForLists,
		total,
	};
}

/**
 * タイトル（セグメント number: 0）でページを検索
 * Drizzle版に移行済み
 */
export async function searchPagesByTitle(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	const allPageIds = await searchPageIdsBySegmentText(query, {
		status: "PUBLIC",
	});
	return transformSearchResults(allPageIds, skip, take, locale);
}

/**
 * タグ名でページを検索
 * Drizzle版に移行済み
 */
export async function searchPagesByTag(
	tagName: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	const allPageIds = await searchPageIdsByTagName(tagName, {
		status: "PUBLIC",
	});
	return transformSearchResults(allPageIds, skip, take, locale);
}

/**
 * コンテンツ（全セグメント）でページを検索
 * Drizzle版に移行済み
 *
 * 注意: この関数は全セグメント（number: 0以外も含む）で検索します
 * タイトルのみを検索したい場合は searchPagesByTitle を使用してください
 */
export async function searchPagesByContent(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<{
	pageForLists: PageForList[];
	total: number;
}> {
	const result = await db
		.selectDistinct({ pageId: segments.contentId })
		.from(segments)
		.innerJoin(pages, eq(segments.contentId, pages.id))
		.where(and(eq(pages.status, "PUBLIC"), ilike(segments.text, `%${query}%`)));

	const allPageIds = result.map((r: { pageId: number }) => r.pageId);
	return transformSearchResults(allPageIds, skip, take, locale);
}
