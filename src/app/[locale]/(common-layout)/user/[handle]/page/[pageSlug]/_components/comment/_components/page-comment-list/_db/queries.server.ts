import { bestTranslationByCommentSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";
import type { JsonValue } from "@/db/types";

/**
 * 複数コメントのセグメントを取得（DISTINCT ONで最良の翻訳1件のみ）
 */
async function fetchSegmentsForCommentIds(
	commentIds: number[],
	locale: string,
) {
	if (commentIds.length === 0) return [];

	const rows = await db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.leftJoin(bestTranslationByCommentSubquery(locale).as("trans"), (join) =>
			join.onRef("trans.segmentId", "=", "segments.id"),
		)
		.select([
			"segments.id",
			"segments.contentId",
			"segments.number",
			"segments.text",
			"segments.textAndOccurrenceHash",
			"segments.createdAt",
			"segments.segmentTypeId",
			"segmentTypes.key as typeKey",
			"segmentTypes.label as typeLabel",
			"trans.id as transId",
			"trans.segmentId as transSegmentId",
			"trans.userId as transUserId",
			"trans.locale as transLocale",
			"trans.text as transText",
			"trans.point as transPoint",
			"trans.createdAt as transCreatedAt",
			"trans.userName",
			"trans.userHandle",
			"trans.userImage",
			"trans.userCreatedAt",
			"trans.userUpdatedAt",
			"trans.userProfile",
			"trans.userTwitterHandle",
			"trans.userTotalPoints",
			"trans.userIsAi",
			"trans.userPlan",
		])
		.where("segments.contentId", "in", commentIds)
		.orderBy("segments.id")
		.execute();

	return rows.map((row) => ({
		id: row.id,
		contentId: row.contentId,
		number: row.number,
		text: row.text,
		textAndOccurrenceHash: row.textAndOccurrenceHash,
		createdAt: row.createdAt,
		segmentTypeId: row.segmentTypeId,
		segmentType: {
			key: row.typeKey,
			label: row.typeLabel,
		},
		segmentTranslation: row.transId
			? {
					id: row.transId,
					segmentId: row.transSegmentId!,
					userId: row.transUserId!,
					locale: row.transLocale!,
					text: row.transText!,
					point: row.transPoint!,
					createdAt: row.transCreatedAt!,
					user: {
						id: row.transUserId!,
						name: row.userName!,
						handle: row.userHandle!,
						image: row.userImage!,
						createdAt: row.userCreatedAt!,
						updatedAt: row.userUpdatedAt!,
						profile: row.userProfile!,
						twitterHandle: row.userTwitterHandle!,
						totalPoints: row.userTotalPoints!,
						isAi: row.userIsAi!,
						plan: row.userPlan!,
					},
				}
			: null,
	}));
}

// コメントとセグメントを結合する共通処理
async function combineCommentsWithSegments(
	comments: Array<{
		id: number;
		pageId: number;
		createdAt: Date;
		updatedAt: Date;
		locale: string;
		userId: string;
		parentId: number | null;
		mdastJson: JsonValue;
		isDeleted: boolean;
		lastReplyAt: Date | null;
		replyCount: number;
		user: {
			handle: string;
			name: string;
			image: string;
		};
	}>,
	locale: string,
) {
	if (comments.length === 0) return [];

	const commentIds = comments.map((c) => c.id);
	const segments = await fetchSegmentsForCommentIds(commentIds, locale);

	const segmentsMap = new Map<number, typeof segments>();
	for (const segment of segments) {
		const existing = segmentsMap.get(segment.contentId) || [];
		segmentsMap.set(segment.contentId, [...existing, segment]);
	}

	return comments.map((comment) => {
		const commentSegments = segmentsMap.get(comment.id) || [];

		return {
			...comment,
			mdastJson: comment.mdastJson,
			user: comment.user,
			content: {
				segments: commentSegments,
			},
		};
	});
}

/**
 * ページコメントとそのセグメントを取得
 */
export async function fetchPageCommentsWithSegments(
	pageId: number,
	locale: string,
) {
	const results = await db
		.selectFrom("pageComments")
		.innerJoin("users", "pageComments.userId", "users.id")
		.select([
			"pageComments.id",
			"pageComments.pageId",
			"pageComments.createdAt",
			"pageComments.updatedAt",
			"pageComments.locale",
			"pageComments.userId",
			"pageComments.parentId",
			"pageComments.mdastJson",
			"pageComments.isDeleted",
			"pageComments.lastReplyAt",
			"pageComments.replyCount",
			"users.handle as userHandle",
			"users.name as userName",
			"users.image as userImage",
		])
		.where("pageComments.pageId", "=", pageId)
		.orderBy("pageComments.createdAt", "asc")
		.execute();

	const comments = results.map((r) => ({
		id: r.id,
		pageId: r.pageId,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		locale: r.locale,
		userId: r.userId,
		parentId: r.parentId,
		mdastJson: r.mdastJson,
		isDeleted: r.isDeleted,
		lastReplyAt: r.lastReplyAt,
		replyCount: r.replyCount,
		user: {
			handle: r.userHandle,
			name: r.userName,
			image: r.userImage,
		},
	}));

	return combineCommentsWithSegments(comments, locale);
}

export type PageCommentWithSegments = NonNullable<
	Awaited<ReturnType<typeof fetchPageCommentsWithSegments>>[number]
> & {
	replies?: PageCommentWithSegments[];
};

// ────────────────────────────────────────────────────────────────────────────────
// Root-only and child-only queries for lazy loading
// ────────────────────────────────────────────────────────────────────────────────

/**
 * トップレベル（親なし）コメント一覧を取得
 */
export async function listRootPageComments(
	pageId: number,
	locale: string,
	take = 20,
	skip = 0,
) {
	const results = await db
		.selectFrom("pageComments")
		.innerJoin("users", "pageComments.userId", "users.id")
		.select([
			"pageComments.id",
			"pageComments.pageId",
			"pageComments.createdAt",
			"pageComments.updatedAt",
			"pageComments.locale",
			"pageComments.userId",
			"pageComments.parentId",
			"pageComments.mdastJson",
			"pageComments.isDeleted",
			"pageComments.lastReplyAt",
			"pageComments.replyCount",
			"users.handle as userHandle",
			"users.name as userName",
			"users.image as userImage",
		])
		.where("pageComments.pageId", "=", pageId)
		.where("pageComments.parentId", "is", null)
		.orderBy("pageComments.createdAt", "asc")
		.limit(take)
		.offset(skip)
		.execute();

	const comments = results.map((r) => ({
		id: r.id,
		pageId: r.pageId,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		locale: r.locale,
		userId: r.userId,
		parentId: r.parentId,
		mdastJson: r.mdastJson,
		isDeleted: r.isDeleted,
		lastReplyAt: r.lastReplyAt,
		replyCount: r.replyCount,
		user: {
			handle: r.userHandle,
			name: r.userName,
			image: r.userImage,
		},
	}));

	return combineCommentsWithSegments(comments, locale);
}

/**
 * 特定のコメント直下の返信一覧を取得
 * Kysely版に移行済み
 */
export async function listChildPageComments(
	parentId: number,
	locale: string,
	take = 20,
	skip = 0,
) {
	const results = await db
		.selectFrom("pageComments")
		.innerJoin("users", "pageComments.userId", "users.id")
		.select([
			"pageComments.id",
			"pageComments.pageId",
			"pageComments.createdAt",
			"pageComments.updatedAt",
			"pageComments.locale",
			"pageComments.userId",
			"pageComments.parentId",
			"pageComments.mdastJson",
			"pageComments.isDeleted",
			"pageComments.lastReplyAt",
			"pageComments.replyCount",
			"users.handle as userHandle",
			"users.name as userName",
			"users.image as userImage",
		])
		.where("pageComments.parentId", "=", parentId)
		.orderBy("pageComments.createdAt", "asc")
		.limit(take)
		.offset(skip)
		.execute();

	const comments = results.map((r) => ({
		id: r.id,
		pageId: r.pageId,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		locale: r.locale,
		userId: r.userId,
		parentId: r.parentId,
		mdastJson: r.mdastJson,
		isDeleted: r.isDeleted,
		lastReplyAt: r.lastReplyAt,
		replyCount: r.replyCount,
		user: {
			handle: r.userHandle,
			name: r.userName,
			image: r.userImage,
		},
	}));

	return combineCommentsWithSegments(comments, locale);
}
