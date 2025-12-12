import { and, asc, eq, isNull } from "drizzle-orm";
import type { Root as MdastRoot } from "mdast";
import { db } from "@/drizzle";
import { pageComments, users } from "@/drizzle/schema";
import { fetchSegmentsForCommentIds } from "./helpers.server";

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
		mdastJson: MdastRoot;
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
 * Drizzle版に移行済み
 */
export async function fetchPageCommentsWithSegments(
	pageId: number,
	locale: string,
) {
	const comments = await db
		.select({
			id: pageComments.id,
			pageId: pageComments.pageId,
			createdAt: pageComments.createdAt,
			updatedAt: pageComments.updatedAt,
			locale: pageComments.locale,
			userId: pageComments.userId,
			parentId: pageComments.parentId,
			mdastJson: pageComments.mdastJson,
			isDeleted: pageComments.isDeleted,
			lastReplyAt: pageComments.lastReplyAt,
			replyCount: pageComments.replyCount,
			user: {
				handle: users.handle,
				name: users.name,
				image: users.image,
			},
		})
		.from(pageComments)
		.innerJoin(users, eq(pageComments.userId, users.id))
		.where(eq(pageComments.pageId, pageId))
		.orderBy(asc(pageComments.createdAt));

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
 * Drizzle版に移行済み
 */
export async function listRootPageComments(
	pageId: number,
	locale: string,
	take = 20,
	skip = 0,
) {
	const comments = await db
		.select({
			id: pageComments.id,
			pageId: pageComments.pageId,
			createdAt: pageComments.createdAt,
			updatedAt: pageComments.updatedAt,
			locale: pageComments.locale,
			userId: pageComments.userId,
			parentId: pageComments.parentId,
			mdastJson: pageComments.mdastJson,
			isDeleted: pageComments.isDeleted,
			lastReplyAt: pageComments.lastReplyAt,
			replyCount: pageComments.replyCount,
			user: {
				handle: users.handle,
				name: users.name,
				image: users.image,
			},
		})
		.from(pageComments)
		.innerJoin(users, eq(pageComments.userId, users.id))
		.where(and(eq(pageComments.pageId, pageId), isNull(pageComments.parentId)))
		.orderBy(asc(pageComments.createdAt))
		.limit(take)
		.offset(skip);

	return combineCommentsWithSegments(comments, locale);
}

/**
 * 特定のコメント直下の返信一覧を取得
 * Drizzle版に移行済み
 */
export async function listChildPageComments(
	parentId: number,
	locale: string,
	take = 20,
	skip = 0,
) {
	const comments = await db
		.select({
			id: pageComments.id,
			pageId: pageComments.pageId,
			createdAt: pageComments.createdAt,
			updatedAt: pageComments.updatedAt,
			locale: pageComments.locale,
			userId: pageComments.userId,
			parentId: pageComments.parentId,
			mdastJson: pageComments.mdastJson,
			isDeleted: pageComments.isDeleted,
			lastReplyAt: pageComments.lastReplyAt,
			replyCount: pageComments.replyCount,
			user: {
				handle: users.handle,
				name: users.name,
				image: users.image,
			},
		})
		.from(pageComments)
		.innerJoin(users, eq(pageComments.userId, users.id))
		.where(eq(pageComments.parentId, parentId))
		.orderBy(asc(pageComments.createdAt))
		.limit(take)
		.offset(skip);

	return combineCommentsWithSegments(comments, locale);
}
