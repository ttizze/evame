import { and, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/drizzle";
import {
	notifications,
	pageComments,
	pages,
	segments,
	segmentTranslations,
	users,
} from "@/drizzle/schema";

// 通知の型定義（シンプルな構造で、必要なフィールドをオプショナルに）
export type NotificationRowsWithRelations = {
	id: number;
	actorId: string;
	actorHandle: string;
	actorName: string;
	actorImage: string;
	read: boolean;
	createdAt: Date;
	type:
		| "FOLLOW"
		| "PAGE_LIKE"
		| "PAGE_COMMENT"
		| "PAGE_SEGMENT_TRANSLATION_VOTE"
		| "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE";
	// ページ関連のフィールド（PAGE_LIKE, PAGE_COMMENT, 翻訳投票で使用）
	pageSlug: string | null;
	pageOwnerHandle: string | null;
	pageTitle: string | null;
	// 翻訳関連のフィールド（翻訳投票で使用）
	segmentTranslationText: string | null;
};

// 内部で使用するDB取得結果の型
type NotificationRow = Awaited<
	ReturnType<typeof fetchNotificationRows>
>[number];

/**
 * 通知データを取得
 */
async function fetchNotificationRows(currentUserHandle: string) {
	const userUsers = alias(users, "user_users");
	const actorUsers = alias(users, "actor_users");

	return await db
		.select({
			id: notifications.id,
			userId: notifications.userId,
			actorId: notifications.actorId,
			type: notifications.type,
			read: notifications.read,
			createdAt: notifications.createdAt,
			pageId: notifications.pageId,
			pageCommentId: notifications.pageCommentId,
			segmentTranslationId: notifications.segmentTranslationId,
			userHandle: userUsers.handle,
			userImage: userUsers.image,
			userName: userUsers.name,
			actorHandle: actorUsers.handle,
			actorImage: actorUsers.image,
			actorName: actorUsers.name,
		})
		.from(notifications)
		.innerJoin(userUsers, eq(notifications.userId, userUsers.id))
		.innerJoin(actorUsers, eq(notifications.actorId, actorUsers.id))
		.where(eq(userUsers.handle, currentUserHandle))
		.orderBy(desc(notifications.createdAt));
}

// ページデータ取得の共通処理
async function fetchPageDataByPageIds(
	pageIds: number[],
	currentUserHandle: string,
): Promise<
	Map<number, { pageSlug: string; pageOwnerHandle: string; pageTitle: string }>
> {
	if (pageIds.length === 0) return new Map();

	const titleSegments = alias(segments, "title_segments");

	const pagesWithTitles = await db
		.select({
			pageId: pages.id,
			pageSlug: pages.slug,
			pageTitle: titleSegments.text,
		})
		.from(pages)
		.innerJoin(
			titleSegments,
			and(eq(titleSegments.contentId, pages.id), eq(titleSegments.number, 0)),
		)
		.where(inArray(pages.id, pageIds));

	const result = new Map<
		number,
		{ pageSlug: string; pageOwnerHandle: string; pageTitle: string }
	>();
	for (const row of pagesWithTitles) {
		result.set(row.pageId, {
			pageSlug: row.pageSlug,
			pageOwnerHandle: currentUserHandle,
			pageTitle: row.pageTitle,
		});
	}
	return result;
}

/**
 * PAGE_LIKE通知用のページデータを取得
 */
async function fetchLikePageData(
	notifications: NotificationRow[],
	currentUserHandle: string,
): Promise<
	Map<number, { pageSlug: string; pageOwnerHandle: string; pageTitle: string }>
> {
	const pageIds = Array.from(
		new Set(
			notifications
				.filter((n) => n.type === "PAGE_LIKE")
				.map((n) => n.pageId as number),
		),
	);
	return fetchPageDataByPageIds(pageIds, currentUserHandle);
}

/**
 * PAGE_COMMENT通知用のページデータを取得
 */
async function fetchCommentPageData(
	notifications: NotificationRow[],
	currentUserHandle: string,
): Promise<
	Map<number, { pageSlug: string; pageOwnerHandle: string; pageTitle: string }>
> {
	const commentIds = Array.from(
		new Set(
			notifications
				.filter((n) => n.type === "PAGE_COMMENT")
				.map((n) => n.pageCommentId as number),
		),
	);

	if (commentIds.length === 0) return new Map();

	const commentsWithPageIds = await db
		.select({
			commentId: pageComments.id,
			pageId: pageComments.pageId,
		})
		.from(pageComments)
		.where(inArray(pageComments.id, commentIds));

	const pageIds = Array.from(new Set(commentsWithPageIds.map((c) => c.pageId)));
	const pageDataMap = await fetchPageDataByPageIds(pageIds, currentUserHandle);

	const result = new Map<
		number,
		{ pageSlug: string; pageOwnerHandle: string; pageTitle: string }
	>();
	for (const row of commentsWithPageIds) {
		const pageData = pageDataMap.get(row.pageId);
		if (pageData) {
			result.set(row.commentId, pageData);
		}
	}
	return result;
}

/**
 * 翻訳通知用のデータを取得
 */
async function fetchTranslationData(notifications: NotificationRow[]): Promise<
	Map<
		number,
		{
			segmentTranslationText: string;
			pageSlug: string;
			pageOwnerHandle: string;
			pageTitle: string;
		}
	>
> {
	const translationIds = Array.from(
		new Set(
			notifications
				.filter(
					(n) =>
						n.type === "PAGE_SEGMENT_TRANSLATION_VOTE" ||
						n.type === "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
				)
				.map((n) => n.segmentTranslationId as number),
		),
	);

	const titleSegments = alias(segments, "title_segments");

	const translationsWithAllData = await db
		.select({
			translationId: segmentTranslations.id,
			translationText: segmentTranslations.text,
			pageSlug: pages.slug,
			userHandle: users.handle,
			pageTitle: titleSegments.text,
		})
		.from(segmentTranslations)
		.innerJoin(segments, eq(segmentTranslations.segmentId, segments.id))
		.innerJoin(pages, eq(segments.contentId, pages.id))
		.innerJoin(users, eq(pages.userId, users.id))
		.innerJoin(
			titleSegments,
			and(eq(titleSegments.contentId, pages.id), eq(titleSegments.number, 0)),
		)
		.where(inArray(segmentTranslations.id, translationIds));

	const result = new Map<
		number,
		{
			segmentTranslationText: string;
			pageSlug: string;
			pageOwnerHandle: string;
			pageTitle: string;
		}
	>();
	for (const row of translationsWithAllData) {
		result.set(row.translationId, {
			segmentTranslationText: row.translationText,
			pageSlug: row.pageSlug,
			pageOwnerHandle: row.userHandle,
			pageTitle: row.pageTitle,
		});
	}
	return result;
}

// 通知オブジェクトを構築するヘルパー関数
function buildNotification(
	base: {
		id: number;
		actorId: string;
		actorHandle: string;
		actorName: string;
		actorImage: string;
		read: boolean;
		createdAt: Date;
	},
	type: NotificationRowsWithRelations["type"],
	pageData: {
		pageSlug: string;
		pageOwnerHandle: string;
		pageTitle: string;
	} | null,
	segmentTranslationText: string | null = null,
): NotificationRowsWithRelations {
	return {
		...base,
		type,
		pageSlug: pageData?.pageSlug ?? null,
		pageOwnerHandle: pageData?.pageOwnerHandle ?? null,
		pageTitle: pageData?.pageTitle ?? null,
		segmentTranslationText: segmentTranslationText ?? null,
	};
}

/**
 * 指定されたユーザーの通知を取得し、フラット構造で返す
 *
 * 通知一覧は表示専用のため、ドメイン構造ではなくフラット構造で返す
 */
export async function fetchNotificationRowsWithRelations(
	currentUserHandle: string,
): Promise<NotificationRowsWithRelations[]> {
	const notificationRows = await fetchNotificationRows(currentUserHandle);

	const [likePageData, commentPageData, translationData] = await Promise.all([
		fetchLikePageData(notificationRows, currentUserHandle),
		fetchCommentPageData(notificationRows, currentUserHandle),
		fetchTranslationData(notificationRows),
	]);

	return notificationRows
		.map((notification): NotificationRowsWithRelations | null => {
			const base = {
				id: notification.id,
				actorId: notification.actorId,
				actorHandle: notification.actorHandle,
				actorName: notification.actorName,
				actorImage: notification.actorImage,
				read: notification.read,
				createdAt: notification.createdAt,
			};

			switch (notification.type) {
				case "FOLLOW": {
					return buildNotification(base, "FOLLOW", null);
				}

				case "PAGE_LIKE": {
					const pageData = notification.pageId
						? likePageData.get(notification.pageId)
						: null;
					if (!pageData) return null;
					return buildNotification(base, "PAGE_LIKE", pageData);
				}

				case "PAGE_COMMENT": {
					const pageData = notification.pageCommentId
						? commentPageData.get(notification.pageCommentId)
						: null;
					if (!pageData) return null;
					return buildNotification(base, "PAGE_COMMENT", pageData);
				}

				case "PAGE_SEGMENT_TRANSLATION_VOTE": {
					const translationDataValue = notification.segmentTranslationId
						? translationData.get(notification.segmentTranslationId)
						: null;
					if (!translationDataValue) return null;
					return buildNotification(
						base,
						"PAGE_SEGMENT_TRANSLATION_VOTE",
						{
							pageSlug: translationDataValue.pageSlug,
							pageOwnerHandle: translationDataValue.pageOwnerHandle,
							pageTitle: translationDataValue.pageTitle,
						},
						translationDataValue.segmentTranslationText,
					);
				}

				case "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE": {
					const translationDataValue = notification.segmentTranslationId
						? translationData.get(notification.segmentTranslationId)
						: null;
					if (!translationDataValue) return null;
					return buildNotification(
						base,
						"PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
						{
							pageSlug: translationDataValue.pageSlug,
							pageOwnerHandle: translationDataValue.pageOwnerHandle,
							pageTitle: translationDataValue.pageTitle,
						},
						translationDataValue.segmentTranslationText,
					);
				}

				default:
					return null;
			}
		})
		.filter((n): n is NotificationRowsWithRelations => n !== null);
}
