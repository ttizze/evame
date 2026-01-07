/**
 * ページリスト取得用クエリ
 *
 * Kyselyの機能を活かしたシンプルな実装
 * - 1クエリでページ + ユーザー + タイトル + カウントを取得
 * - タグのみ別クエリ（配列集約のため）
 */

import { sql } from "kysely";
import { db } from "@/db";
import type { PageStatus } from "@/db/types";
import type { PageForList, PageForTitle, SegmentForList } from "../types";

// ============================================
// 内部型定義
// ============================================

type PageListParams = {
	page?: number;
	pageSize?: number;
	pageOwnerId?: string;
	locale?: string;
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
async function fetchTagsMap(pageIds: number[]) {
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
		.select(sql<number>`count(*)::int`.as("count"))
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
	return result?.count ?? 0;
}

/**
 * クエリ結果をPageForListに変換
 */
function toPageForList(
	row: PageRowWithRelations,
	tags: { id: number; name: string }[],
): PageForList {
	const segment: SegmentForList | null = row.segmentId
		? {
				id: row.segmentId,
				contentId: row.id,
				number: 0,
				text: row.segmentText!,
				textAndOccurrenceHash: row.segmentHash!,
				createdAt: row.segmentCreatedAt!,
				segmentTypeId: row.segmentTypeId!,
				segmentType: {
					key: row.segmentTypeKey!,
					label: row.segmentTypeLabel!,
				},
				segmentTranslation: row.translationId
					? {
							id: row.translationId,
							segmentId: row.segmentId,
							userId: row.translationUserId!,
							locale: row.translationLocale!,
							text: row.translationText!,
							point: row.translationPoint!,
							createdAt: row.translationCreatedAt!,
							user: {
								id: row.translationUserId!,
								name: row.transUserName!,
								handle: row.transUserHandle!,
								image: row.transUserImage!,
								createdAt: row.transUserCreatedAt!,
								updatedAt: row.transUserUpdatedAt!,
								profile: row.transUserProfile!,
								twitterHandle: row.transUserTwitterHandle!,
								totalPoints: row.transUserTotalPoints!,
								isAi: row.transUserIsAi!,
								plan: row.transUserPlan!,
							},
						}
					: null,
			}
		: null;

	return {
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
			isAi: row.userIsAi,
			plan: row.userPlan,
		},
		content: {
			segments: segment ? [segment] : [],
		},
		tagPages: tags.map((tag) => ({ tag })),
		likeCount: row.likeCount,
		_count: {
			pageComments: row.commentCount,
			children: row.childrenCount,
		},
	};
}

// row型定義
type PageRowWithRelations = {
	id: number;
	slug: string;
	createdAt: Date;
	updatedAt: Date;
	status: PageStatus;
	sourceLocale: string;
	parentId: number | null;
	order: number;
	// user
	userId: string;
	userName: string;
	userHandle: string;
	userImage: string;
	userCreatedAt: Date;
	userUpdatedAt: Date;
	userProfile: string;
	userTwitterHandle: string;
	userTotalPoints: number;
	userIsAi: boolean;
	userPlan: string;
	// segment (nullable)
	segmentId: number | null;
	segmentText: string | null;
	segmentHash: string | null;
	segmentCreatedAt: Date | null;
	segmentTypeId: number | null;
	segmentTypeKey: string | null;
	segmentTypeLabel: string | null;
	// translation (nullable)
	translationId: number | null;
	translationUserId: string | null;
	translationLocale: string | null;
	translationText: string | null;
	translationPoint: number | null;
	translationCreatedAt: Date | null;
	// translation user (nullable)
	transUserName: string | null;
	transUserHandle: string | null;
	transUserImage: string | null;
	transUserCreatedAt: Date | null;
	transUserUpdatedAt: Date | null;
	transUserProfile: string | null;
	transUserTwitterHandle: string | null;
	transUserTotalPoints: number | null;
	transUserIsAi: boolean | null;
	transUserPlan: string | null;
	// counts
	commentCount: number;
	childrenCount: number;
	likeCount: number;
};

/**
 * ページリストのベースクエリを構築
 * ページ + ユーザー + タイトルセグメント + 最良翻訳 + カウントを1クエリで取得
 */
function buildPageListQuery(locale: string) {
	return (
		db
			.selectFrom("pages")
			.innerJoin("users", "pages.userId", "users.id")
			// タイトルセグメント (number = 0)
			.leftJoin(
				(eb) =>
					eb
						.selectFrom("segments")
						.innerJoin(
							"segmentTypes",
							"segments.segmentTypeId",
							"segmentTypes.id",
						)
						.select([
							"segments.id",
							"segments.contentId",
							"segments.text",
							"segments.textAndOccurrenceHash",
							"segments.createdAt",
							"segments.segmentTypeId",
							"segmentTypes.key as typeKey",
							"segmentTypes.label as typeLabel",
						])
						.where("segments.number", "=", 0)
						.as("seg"),
				(join) => join.onRef("seg.contentId", "=", "pages.id"),
			)
			// 最良の翻訳 (DISTINCT ON で1件のみ)
			.leftJoin(
				(eb) =>
					eb
						.selectFrom("segmentTranslations")
						.innerJoin(
							"users as transUser",
							"segmentTranslations.userId",
							"transUser.id",
						)
						.distinctOn("segmentTranslations.segmentId")
						.select([
							"segmentTranslations.id",
							"segmentTranslations.segmentId",
							"segmentTranslations.userId",
							"segmentTranslations.locale",
							"segmentTranslations.text",
							"segmentTranslations.point",
							"segmentTranslations.createdAt",
							"transUser.name as transUserName",
							"transUser.handle as transUserHandle",
							"transUser.image as transUserImage",
							"transUser.createdAt as transUserCreatedAt",
							"transUser.updatedAt as transUserUpdatedAt",
							"transUser.profile as transUserProfile",
							"transUser.twitterHandle as transUserTwitterHandle",
							"transUser.totalPoints as transUserTotalPoints",
							"transUser.isAi as transUserIsAi",
							"transUser.plan as transUserPlan",
						])
						.where("segmentTranslations.locale", "=", locale)
						.orderBy("segmentTranslations.segmentId")
						.orderBy("segmentTranslations.point", "desc")
						.orderBy("segmentTranslations.createdAt", "desc")
						.as("trans"),
				(join) => join.onRef("trans.segmentId", "=", "seg.id"),
			)
			.select((eb) => [
				"pages.id",
				"pages.slug",
				"pages.createdAt",
				"pages.updatedAt",
				"pages.status",
				"pages.sourceLocale",
				"pages.parentId",
				"pages.order",
				// user
				"users.id as userId",
				"users.name as userName",
				"users.handle as userHandle",
				"users.image as userImage",
				"users.createdAt as userCreatedAt",
				"users.updatedAt as userUpdatedAt",
				"users.profile as userProfile",
				"users.twitterHandle as userTwitterHandle",
				"users.totalPoints as userTotalPoints",
				"users.isAi as userIsAi",
				"users.plan as userPlan",
				// segment
				"seg.id as segmentId",
				"seg.text as segmentText",
				"seg.textAndOccurrenceHash as segmentHash",
				"seg.createdAt as segmentCreatedAt",
				"seg.segmentTypeId as segmentTypeId",
				"seg.typeKey as segmentTypeKey",
				"seg.typeLabel as segmentTypeLabel",
				// translation
				"trans.id as translationId",
				"trans.userId as translationUserId",
				"trans.locale as translationLocale",
				"trans.text as translationText",
				"trans.point as translationPoint",
				"trans.createdAt as translationCreatedAt",
				"trans.transUserName",
				"trans.transUserHandle",
				"trans.transUserImage",
				"trans.transUserCreatedAt",
				"trans.transUserUpdatedAt",
				"trans.transUserProfile",
				"trans.transUserTwitterHandle",
				"trans.transUserTotalPoints",
				"trans.transUserIsAi",
				"trans.transUserPlan",
				// counts (サブクエリ)
				eb
					.selectFrom("pageComments")
					.select(eb.fn.countAll().as("count"))
					.whereRef("pageComments.pageId", "=", "pages.id")
					.where("pageComments.isDeleted", "=", false)
					.as("commentCount"),
				eb
					.selectFrom("pages as c")
					.select(eb.fn.countAll().as("count"))
					.whereRef("c.parentId", "=", "pages.id")
					.where("c.status", "=", "PUBLIC")
					.as("childrenCount"),
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

	const rows = (await query
		.orderBy("pages.createdAt", "desc")
		.limit(pageSize)
		.offset(offset)
		.execute()) as PageRowWithRelations[];

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
	const rows = (await query
		.orderBy(
			sql`(SELECT COUNT(*) FROM like_pages WHERE like_pages.page_id = pages.id)`,
			"desc",
		)
		.orderBy("pages.createdAt", "desc")
		.limit(pageSize)
		.offset(offset)
		.execute()) as PageRowWithRelations[];

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
 * 子ページを取得
 */
export async function fetchChildPages(
	parentId: number,
	locale: string,
): Promise<PageForTitle[]> {
	const rows = (await buildPageListQuery(locale)
		.where("pages.status", "=", "PUBLIC")
		.where("pages.parentId", "=", parentId)
		.orderBy("pages.order", "asc")
		.execute()) as PageRowWithRelations[];

	return rows.map((row) => {
		const segment: SegmentForList | null = row.segmentId
			? {
					id: row.segmentId,
					contentId: row.id,
					number: 0,
					text: row.segmentText!,
					textAndOccurrenceHash: row.segmentHash!,
					createdAt: row.segmentCreatedAt!,
					segmentTypeId: row.segmentTypeId!,
					segmentType: {
						key: row.segmentTypeKey!,
						label: row.segmentTypeLabel!,
					},
					segmentTranslation: row.translationId
						? {
								id: row.translationId,
								segmentId: row.segmentId,
								userId: row.translationUserId!,
								locale: row.translationLocale!,
								text: row.translationText!,
								point: row.translationPoint!,
								createdAt: row.translationCreatedAt!,
								user: {
									id: row.translationUserId!,
									name: row.transUserName!,
									handle: row.transUserHandle!,
									image: row.transUserImage!,
									createdAt: row.transUserCreatedAt!,
									updatedAt: row.transUserUpdatedAt!,
									profile: row.transUserProfile!,
									twitterHandle: row.transUserTwitterHandle!,
									totalPoints: row.transUserTotalPoints!,
									isAi: row.transUserIsAi!,
									plan: row.transUserPlan!,
								},
							}
						: null,
				}
			: null;

		return {
			id: row.id,
			slug: row.slug,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			status: row.status,
			sourceLocale: row.sourceLocale,
			parentId: row.parentId,
			order: row.order,
			likeCount: row.likeCount,
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
				isAi: row.userIsAi,
				plan: row.userPlan,
			},
			content: {
				segments: segment ? [segment] : [],
			},
			_count: {
				children: row.childrenCount,
			},
		};
	});
}

/**
 * 指定IDのページリストを取得（検索結果用）
 */
export async function fetchPagesByIds(
	pageIds: number[],
	locale: string,
): Promise<PageForList[]> {
	if (pageIds.length === 0) return [];

	const rows = (await buildPageListQuery(locale)
		.where("pages.id", "in", pageIds)
		.execute()) as PageRowWithRelations[];

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
