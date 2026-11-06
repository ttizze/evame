import { bestTranslationId } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";
import type { JsonValue } from "@/db/types";

type CommentRow = {
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
};

export type PageCommentSegment = {
	id: number;
	contentId: number;
	number: number;
	text: string;
	translationText: string | null;
};

export type PageComment = CommentRow & {
	content: {
		segments: PageCommentSegment[];
	};
};

export type PageCommentWithSegments = PageComment & {
	replies?: PageCommentWithSegments[];
};

type CommentSegmentRow = PageCommentSegment;

async function fetchSegmentsForCommentIds(
	commentIds: number[],
	locale: string,
): Promise<CommentSegmentRow[]> {
	if (commentIds.length === 0) return [];

	return db
		.selectFrom("segments")
		.innerJoin(
			"pageComments as ownerComment",
			"ownerComment.id",
			"segments.contentId",
		)
		.leftJoin("segmentTranslations as trans", (join) =>
			join.on("trans.id", "=", (eb) =>
				bestTranslationId(
					eb.ref("segments.id"),
					eb.ref("ownerComment.userId"),
					locale,
				),
			),
		)
		.select([
			"segments.id",
			"segments.contentId",
			"segments.number",
			"segments.text",
			"trans.text as translationText",
		])
		.where("segments.contentId", "in", commentIds)
		.orderBy("segments.id")
		.execute();
}

async function combineCommentsWithSegments(
	comments: CommentRow[],
	locale: string,
): Promise<PageComment[]> {
	if (comments.length === 0) return [];

	const commentIds = comments.map((comment) => comment.id);
	const segments = await fetchSegmentsForCommentIds(commentIds, locale);
	const segmentsMap = new Map<number, PageCommentSegment[]>();

	for (const segment of segments) {
		const existing = segmentsMap.get(segment.contentId) ?? [];
		existing.push(segment);
		segmentsMap.set(segment.contentId, existing);
	}

	return comments.map((comment) => ({
		...comment,
		content: { segments: segmentsMap.get(comment.id) ?? [] },
	}));
}

async function fetchCommentRows(pageId: number): Promise<CommentRow[]> {
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

	return results.map((row) => ({
		id: row.id,
		pageId: row.pageId,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		locale: row.locale,
		userId: row.userId,
		parentId: row.parentId,
		mdastJson: row.mdastJson,
		isDeleted: row.isDeleted,
		lastReplyAt: row.lastReplyAt,
		replyCount: row.replyCount,
		user: {
			handle: row.userHandle,
			name: row.userName,
			image: row.userImage,
		},
	}));
}
/** ページコメントとそのセグメントを取得 */
export async function fetchPageCommentsWithSegments(
	pageId: number,
	locale: string,
): Promise<PageComment[]> {
	const comments = await fetchCommentRows(pageId);
	return combineCommentsWithSegments(comments, locale);
}

/** トップレベル（親なし）コメント一覧を取得 */
export async function listRootPageComments(
	pageId: number,
	locale: string,
	take = 20,
	skip = 0,
): Promise<PageComment[]> {
	const comments = await fetchCommentRows(pageId);
	const roots = comments
		.filter((comment) => comment.parentId === null)
		.slice(skip, skip + take);
	return combineCommentsWithSegments(roots, locale);
}

/** 特定コメント直下の返信一覧を取得 */
export async function listChildPageComments(
	parentId: number,
	locale: string,
	take = 20,
	skip = 0,
): Promise<PageComment[]> {
	const comments = await fetchCommentRowsByParent(parentId);
	return combineCommentsWithSegments(comments.slice(skip, skip + take), locale);
}

async function fetchCommentRowsByParent(
	parentId: number,
): Promise<CommentRow[]> {
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
		.execute();

	return results.map((row) => ({
		id: row.id,
		pageId: row.pageId,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		locale: row.locale,
		userId: row.userId,
		parentId: row.parentId,
		mdastJson: row.mdastJson,
		isDeleted: row.isDeleted,
		lastReplyAt: row.lastReplyAt,
		replyCount: row.replyCount,
		user: {
			handle: row.userHandle,
			name: row.userName,
			image: row.userImage,
		},
	}));
}
