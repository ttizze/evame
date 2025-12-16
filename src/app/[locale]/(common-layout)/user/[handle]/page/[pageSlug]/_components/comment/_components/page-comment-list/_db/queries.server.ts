import type { Root as MdastRoot } from "mdast";
import { db } from "@/db";
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
 * Kysely版に移行済み
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
		mdastJson: r.mdastJson as MdastRoot,
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
 * Kysely版に移行済み
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
		mdastJson: r.mdastJson as MdastRoot,
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
		mdastJson: r.mdastJson as MdastRoot,
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
