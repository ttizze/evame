/**
 * ページリスト取得用クエリ
 *
 * Kyselyの機能を活かしたシンプルな実装
 * - 1クエリでページ + ユーザー + タイトル + カウントを取得
 * - タグのみ別クエリ（配列集約のため）
 */

import { db } from "@/db";
import type { PageStatus } from "@/db/types";
import type { PageForList, TitleSegment } from "../types";
import { bestTranslationByPagesSubquery } from "./best-translation-subquery.server";

// ============================================
// 内部型定義
// ============================================

type PageListParams = {
	page: number;
	pageSize: number;
	pageOwnerId?: string;
	locale: string;
};

type PaginatedResult = {
	pageForLists: PageForList[];
	totalPages: number;
};

// ============================================
// 共通ヘルパー
// ============================================

/**
 * タグを取得してMapで返す
 */
export async function fetchTagsMap(pageIds: number[]) {
	if (pageIds.length === 0)
		return new Map<number, { id: number; name: string }[]>();

	const tags = await db
		.selectFrom("tagPages")
		.innerJoin("tags", "tagPages.tagId", "tags.id")
		.select(["tagPages.pageId", "tags.id as tagId", "tags.name as tagName"])
		.where("tagPages.pageId", "in", pageIds)
		.execute();

	const map = new Map<number, { id: number; name: string }[]>();
	for (const t of tags) {
		const existing = map.get(t.pageId) || [];
		existing.push({ id: t.tagId, name: t.tagName });
		map.set(t.pageId, existing);
	}
	return map;
}

/**
 * 総ページ数を取得
 */
async function fetchTotalCount(
	status: PageStatus,
	parentId: number | null,
	userId?: string,
): Promise<number> {
	let query = db
		.selectFrom("pages")
		.select((eb) => eb.fn.countAll().as("count"))
		.where("status", "=", status);

	if (parentId === null) {
		query = query.where("parentId", "is", null);
	} else {
		query = query.where("parentId", "=", parentId);
	}

	if (userId) {
		query = query.where("userId", "=", userId);
	}

	const result = await query.executeTakeFirst();
	return Number(result?.count ?? 0);
}

/**
 * クエリ結果をPageForListに変換
 */
type PageRow = Awaited<
	ReturnType<ReturnType<typeof buildPageListQuery>["execute"]>
>[number];

function toTitleSegment(row: PageRow): TitleSegment {
	return {
		id: row.segmentId,
		contentId: row.id,
		number: 0,
		text: row.segmentText,
		translationText: row.translationText ?? null,
	};
}

export function toPageForList(
	row: PageRow,
	tags: { id: number; name: string }[],
): PageForList {
	return {
		id: row.id,
		slug: row.slug,
		createdAt: row.createdAt,
		status: row.status,
		userHandle: row.userHandle,
		userName: row.userName,
		userImage: row.userImage,
		titleSegment: toTitleSegment(row),
		tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
		likeCount: Number(row.likeCount ?? 0),
		pageCommentsCount: Number(row.pageCommentsCount ?? 0),
	};
}

/**
 * ページリストのベースクエリを構築
 * ページ + ユーザー + タイトルセグメント + 最良翻訳 + カウントを1クエリで取得
 */
export function buildPageListQuery(locale: string) {
	return (
		db
			.selectFrom("pages")
			.innerJoin("users", "pages.userId", "users.id")
			// タイトルセグメント (number = 0)
			.innerJoin(
				(eb) =>
					eb
						.selectFrom("segments")
						.select([
							"segments.id",
							"segments.contentId",
							"segments.text",
							"segments.number",
						])
						.where("segments.number", "=", 0)
						.as("seg"),
				(join) => join.onRef("seg.contentId", "=", "pages.id"),
			)
			// 最良の翻訳 (DISTINCT ON で1件のみ)
			.leftJoin(bestTranslationByPagesSubquery(locale).as("trans"), (join) =>
				join.onRef("trans.segmentId", "=", "seg.id"),
			)
			.select((eb) => [
				"pages.id",
				"pages.slug",
				"pages.createdAt",
				"pages.status",
				// user
				"users.name as userName",
				"users.handle as userHandle",
				"users.image as userImage",
				// segment
				"seg.id as segmentId",
				"seg.text as segmentText",
				// translation
				"trans.text as translationText",
				// counts (サブクエリ)
				eb
					.selectFrom("pageComments")
					.select(eb.fn.countAll().as("count"))
					.whereRef("pageComments.pageId", "=", "pages.id")
					.where("pageComments.isDeleted", "=", false)
					.as("pageCommentsCount"),
				eb
					.selectFrom("likePages")
					.select(eb.fn.countAll().as("count"))
					.whereRef("likePages.pageId", "=", "pages.id")
					.as("likeCount"),
			])
	);
}

// ============================================
// 公開API
// ============================================

/**
 * 新着ページリストを取得
 */
export async function fetchPaginatedNewPageLists({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	locale = "en",
}: PageListParams): Promise<PaginatedResult> {
	const offset = (page - 1) * pageSize;

	let query = buildPageListQuery(locale)
		.where("pages.status", "=", "PUBLIC")
		.where("pages.parentId", "is", null);

	if (pageOwnerId) {
		query = query.where("pages.userId", "=", pageOwnerId);
	}

	const rows = await query
		.orderBy("pages.createdAt", "desc")
		.limit(pageSize)
		.offset(offset)
		.execute();

	const pageIds = rows.map((r) => r.id);
	const [tagsMap, total] = await Promise.all([
		fetchTagsMap(pageIds),
		fetchTotalCount("PUBLIC", null, pageOwnerId),
	]);

	const pageForLists = rows.map((row) =>
		toPageForList(row, tagsMap.get(row.id) || []),
	);

	return {
		pageForLists,
		totalPages: Math.ceil(total / pageSize),
	};
}

/**
 * 人気ページリストを取得
 */
export async function fetchPaginatedPopularPageLists({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	locale = "en",
}: PageListParams): Promise<PaginatedResult> {
	const offset = (page - 1) * pageSize;

	let query = buildPageListQuery(locale)
		.where("pages.status", "=", "PUBLIC")
		.where("pages.parentId", "is", null);

	if (pageOwnerId) {
		query = query.where("pages.userId", "=", pageOwnerId);
	}

	// いいね数でソート（サブクエリ）
	const rows = await query
		.orderBy("likeCount", "desc")
		.orderBy("pages.createdAt", "desc")
		.limit(pageSize)
		.offset(offset)
		.execute();

	const pageIds = rows.map((r) => r.id);
	const [tagsMap, total] = await Promise.all([
		fetchTagsMap(pageIds),
		fetchTotalCount("PUBLIC", null, pageOwnerId),
	]);

	const pageForLists = rows.map((row) =>
		toPageForList(row, tagsMap.get(row.id) || []),
	);

	return {
		pageForLists,
		totalPages: Math.ceil(total / pageSize),
	};
}
