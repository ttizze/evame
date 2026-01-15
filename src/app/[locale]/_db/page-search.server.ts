/**
 * ページ検索用クエリ
 *
 * タイトル、タグ、コンテンツでページを検索
 */

import { sql } from "kysely";
import { db } from "@/db";
import type { PageStatus } from "@/db/types";
import type { PageForList } from "../types";
import {
	buildPageListQuery,
	fetchTagsMap,
	toPageForList,
} from "./page-list.server";

type SearchResult = {
	pageForLists: PageForList[];
	total: number;
};

/**
 * 指定IDのページリストを取得（検索結果用）
 */
async function fetchPagesByIds(
	pageIds: number[],
	locale: string,
): Promise<PageForList[]> {
	if (pageIds.length === 0) return [];

	const rows = await buildPageListQuery(locale)
		.where("pages.id", "in", pageIds)
		.execute();

	const tagsMap = await fetchTagsMap(pageIds);

	// 元の順序を保持
	const rowMap = new Map(rows.map((r) => [r.id, r]));
	return pageIds
		.map((id) => {
			const row = rowMap.get(id);
			if (!row) return null;
			return toPageForList(row, tagsMap.get(row.id) || []);
		})
		.filter((p): p is PageForList => p !== null);
}

// ============================================
// タイトル検索
// ============================================

/**
 * タイトル（セグメント number: 0）でページIDを検索
 */
async function searchPageIdsByTitle(
	query: string,
	status: PageStatus = "PUBLIC",
): Promise<number[]> {
	const result = await db
		.selectFrom("segments")
		.innerJoin("pages", "segments.contentId", "pages.id")
		.select("segments.contentId as pageId")
		.distinct()
		.where("segments.number", "=", 0)
		.where("segments.text", "ilike", `%${query}%`)
		.where("pages.status", "=", status)
		.execute();

	return result.map((r) => r.pageId);
}

/**
 * タイトルでページを検索
 */
export async function searchPagesByTitle(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<SearchResult> {
	const allPageIds = await searchPageIdsByTitle(query, "PUBLIC");
	const total = allPageIds.length;
	const pageIds = allPageIds.slice(skip, skip + take);

	if (pageIds.length === 0) {
		return { pageForLists: [], total };
	}

	const pageForLists = await fetchPagesByIds(pageIds, locale);
	return { pageForLists, total };
}

// ============================================
// タグ検索
// ============================================

/**
 * タグ名でページIDを検索
 */
async function searchPageIdsByTagName(
	tagName: string,
	status: PageStatus = "PUBLIC",
): Promise<number[]> {
	const result = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.innerJoin("pages", "tagPages.pageId", "pages.id")
		.select("tagPages.pageId")
		.distinct()
		.where("tags.name", "=", tagName)
		.where("pages.status", "=", status)
		.execute();

	return result.map((r) => r.pageId);
}

/**
 * タグ名でページを検索
 */
export async function searchPagesByTag(
	tagName: string,
	skip: number,
	take: number,
	locale: string,
): Promise<SearchResult> {
	const allPageIds = await searchPageIdsByTagName(tagName, "PUBLIC");
	const total = allPageIds.length;
	const pageIds = allPageIds.slice(skip, skip + take);

	if (pageIds.length === 0) {
		return { pageForLists: [], total };
	}

	const pageForLists = await fetchPagesByIds(pageIds, locale);
	return { pageForLists, total };
}

/**
 * タグ名でページを検索（人気順でソート）
 */
export async function fetchPopularPagesByTag(
	tagName: string,
	skip: number,
	take: number,
	locale: string,
): Promise<SearchResult> {
	// 該当ページIDを人気順で取得
	const result = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.innerJoin("pages", "tagPages.pageId", "pages.id")
		.select("tagPages.pageId")
		.distinct()
		.where("tags.name", "=", tagName)
		.where("pages.status", "=", "PUBLIC")
		.orderBy(
			sql`(SELECT COUNT(*) FROM like_pages WHERE like_pages.page_id = tag_pages.page_id)`,
			"desc",
		)
		.execute();

	const allPageIds = result.map((r) => r.pageId);
	const total = allPageIds.length;
	const pageIds = allPageIds.slice(skip, skip + take);

	if (pageIds.length === 0) {
		return { pageForLists: [], total };
	}

	const pageForLists = await fetchPagesByIds(pageIds, locale);
	return { pageForLists, total };
}

// ============================================
// コンテンツ検索
// ============================================

/**
 * コンテンツ（全セグメント）でページを検索
 */
export async function searchPagesByContent(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<SearchResult> {
	const result = await db
		.selectFrom("segments")
		.innerJoin("pages", "segments.contentId", "pages.id")
		.select("segments.contentId as pageId")
		.distinct()
		.where("pages.status", "=", "PUBLIC")
		.where("segments.text", "ilike", `%${query}%`)
		.execute();

	const allPageIds = result.map((r) => r.pageId);
	const total = allPageIds.length;
	const pageIds = allPageIds.slice(skip, skip + take);

	if (pageIds.length === 0) {
		return { pageForLists: [], total };
	}

	const pageForLists = await fetchPagesByIds(pageIds, locale);
	return { pageForLists, total };
}
