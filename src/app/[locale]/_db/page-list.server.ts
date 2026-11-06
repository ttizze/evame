/**
 * ページリスト取得用クエリ
 *
 * Kyselyの機能を活かしたシンプルな実装
 * - 1クエリでページ + ユーザー + タイトル + カウントを取得
 * - タグのみ別クエリ（配列集約のため）
 */

import { db } from "@/db";
import type { PageForList } from "../types";
import { bestTranslationId } from "./best-translation-subquery.server";

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
 * クエリ結果をPageForListに変換
 */
type PageRow = Awaited<
	ReturnType<ReturnType<typeof buildPageListQuery>["execute"]>
>[number];

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
		titleSegment: {
			id: row.segmentId,
			contentId: row.id,
			number: 0,
			text: row.segmentText,
			translationText: row.translationText ?? null,
		},
		tags,
		likeCount: Number(row.likeCount ?? 0),
		pageCommentsCount: Number(row.pageCommentsCount ?? 0),
		viewCount: Number(row.pageViewCount ?? 0),
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
			.innerJoin("segments as seg", (join) =>
				join.onRef("seg.contentId", "=", "pages.id").on("seg.number", "=", 0),
			)
			// 最良の翻訳 (各段落の順位1位のみ)
			.leftJoin("segmentTranslations as trans", (join) =>
				join.on("trans.id", "=", (eb) =>
					bestTranslationId(eb.ref("seg.id"), eb.ref("pages.userId"), locale),
				),
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
					.selectFrom("likePages")
					.select(eb.fn.countAll().as("count"))
					.whereRef("likePages.pageId", "=", "pages.id")
					.as("likeCount"),
				eb
					.selectFrom("pageComments")
					.select(eb.fn.countAll().as("count"))
					.whereRef("pageComments.pageId", "=", "pages.id")
					.where("pageComments.isDeleted", "=", false)
					.as("pageCommentsCount"),
				eb
					.selectFrom("pageViews")
					.select("count")
					.whereRef("pageViews.pageId", "=", "pages.id")
					.as("pageViewCount"),
			])
	);
}

/** 一覧と件数で、タイトルのある公開ルート記事を同じ条件で選ぶ。 */
function publicRootPages(pageOwnerId: string | null) {
	let query = db
		.selectFrom("pages")
		.where("pages.status", "=", "PUBLIC")
		.where("pages.parentId", "is", null)
		.where((eb) =>
			eb.exists(
				eb
					.selectFrom("segments")
					.select("segments.id")
					.whereRef("segments.contentId", "=", "pages.id")
					.where("segments.number", "=", 0),
			),
		);

	if (pageOwnerId) {
		query = query.where("pages.userId", "=", pageOwnerId);
	}
	return query;
}

/** 表示対象を先に絞り、その記事の翻訳・著者・カウントだけを取得する。 */
export function fetchPageRows(
	locale: string,
	page: number,
	pageSize: number,
	pageOwnerId: string | null,
	sort: "new" | "popular",
) {
	let selectedPages = publicRootPages(pageOwnerId).select("pages.id");
	if (sort === "popular") {
		selectedPages = selectedPages.orderBy(
			(eb) =>
				eb
					.selectFrom("likePages")
					.select(eb.fn.countAll().as("count"))
					.whereRef("likePages.pageId", "=", "pages.id"),
			"desc",
		);
	}
	// タイトル・翻訳・著者などの結合より先に表示対象を確定する。
	const ids = selectedPages
		.orderBy("pages.createdAt", "desc")
		.limit(pageSize)
		.offset((page - 1) * pageSize);
	let query = buildPageListQuery(locale).where("pages.id", "in", ids);
	if (sort === "popular") query = query.orderBy("likeCount", "desc");
	return query.orderBy("pages.createdAt", "desc").execute();
}

/** 一覧と同じ公開条件の総件数とタグを付けてページ分けする。 */
export async function fetchPaginatedPageLists({
	page,
	pageSize,
	pageOwnerId,
	locale,
	sort,
}: {
	page: number;
	pageSize: number;
	pageOwnerId: string | null;
	locale: string;
	sort: "new" | "popular";
}) {
	const rows = await fetchPageRows(locale, page, pageSize, pageOwnerId, sort);
	const pageIds = rows.map((r) => r.id);
	const [tagsMap, total] = await Promise.all([
		fetchTagsMap(pageIds),
		publicRootPages(pageOwnerId)
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.executeTakeFirstOrThrow(),
	]);

	const pageForLists = rows.map((row) =>
		toPageForList(row, tagsMap.get(row.id) || []),
	);

	return {
		pageForLists,
		totalPages: Math.ceil(total.count / pageSize),
	};
}
