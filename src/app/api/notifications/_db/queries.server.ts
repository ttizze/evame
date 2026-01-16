import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { db } from "@/db";

// 内部で使用するDB取得結果の型
type NotificationRow = Awaited<
	ReturnType<typeof fetchNotificationRows>
>[number];

/**
 * 通知データを取得
 */
async function fetchNotificationRows(currentUserHandle: string) {
	return await db
		.selectFrom("notifications")
		.innerJoin("users as userUsers", "notifications.userId", "userUsers.id")
		.innerJoin("users as actorUsers", "notifications.actorId", "actorUsers.id")
		.select([
			"notifications.id",
			"notifications.userId",
			"notifications.actorId",
			"notifications.type",
			"notifications.read",
			"notifications.createdAt",
			"notifications.pageId",
			"notifications.pageCommentId",
			"notifications.segmentTranslationId",
			"userUsers.handle as userHandle",
			"userUsers.image as userImage",
			"userUsers.name as userName",
			"actorUsers.handle as actorHandle",
			"actorUsers.image as actorImage",
			"actorUsers.name as actorName",
		])
		.where("userUsers.handle", "=", currentUserHandle)
		.orderBy("notifications.createdAt", "desc")
		.execute();
}

// ページデータ取得の共通処理
async function fetchPageDataByPageIds(
	pageIds: number[],
): Promise<
	Map<number, { pageSlug: string; pageOwnerHandle: string; pageTitle: string }>
> {
	if (pageIds.length === 0) return new Map();

	const pagesWithTitles = await db
		.selectFrom("pages")
		.innerJoin("users", "pages.userId", "users.id")
		.innerJoin("segments as titleSegments", (join) =>
			join
				.onRef("titleSegments.contentId", "=", "pages.id")
				.on("titleSegments.number", "=", 0),
		)
		.select([
			"pages.id as pageId",
			"pages.slug as pageSlug",
			"titleSegments.text as pageTitle",
			"users.handle as userHandle",
		])
		.where("pages.id", "in", pageIds)
		.execute();

	const result = new Map<
		number,
		{ pageSlug: string; pageOwnerHandle: string; pageTitle: string }
	>();
	for (const row of pagesWithTitles) {
		result.set(row.pageId, {
			pageSlug: row.pageSlug,
			pageOwnerHandle: row.userHandle,
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
	return fetchPageDataByPageIds(pageIds);
}

/**
 * PAGE_COMMENT通知用のページデータを取得
 */
async function fetchCommentPageData(
	notifications: NotificationRow[],
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
		.selectFrom("pageComments")
		.select(["id as commentId", "pageId"])
		.where("id", "in", commentIds)
		.execute();

	const pageIds = Array.from(new Set(commentsWithPageIds.map((c) => c.pageId)));
	const pageDataMap = await fetchPageDataByPageIds(pageIds);

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

	if (translationIds.length === 0) return new Map();

	const translationsWithAllData = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.innerJoin("pages", "segments.contentId", "pages.id")
		.innerJoin("users", "pages.userId", "users.id")
		.innerJoin("segments as titleSegments", (join) =>
			join
				.onRef("titleSegments.contentId", "=", "pages.id")
				.on("titleSegments.number", "=", 0),
		)
		.select([
			"segmentTranslations.id as translationId",
			"segmentTranslations.text as translationText",
			"pages.slug as pageSlug",
			"users.handle as userHandle",
			"titleSegments.text as pageTitle",
		])
		.where("segmentTranslations.id", "in", translationIds)
		.execute();

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
		fetchLikePageData(notificationRows),
		fetchCommentPageData(notificationRows),
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
