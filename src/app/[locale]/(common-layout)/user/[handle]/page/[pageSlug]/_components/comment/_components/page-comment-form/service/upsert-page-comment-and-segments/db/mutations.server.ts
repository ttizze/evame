import { and, eq, sql } from "drizzle-orm";
import type { Root as MdastRoot } from "mdast";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { contents, pageComments } from "@/drizzle/schema";

/**
 * ページコメントを更新する（DB操作のみ）
 */
export async function updatePageComment(
	tx: TransactionClient,
	pageCommentId: number,
	userId: string,
	mdastJson: MdastRoot,
	locale: string,
): Promise<typeof pageComments.$inferSelect> {
	const [updated] = await tx
		.update(pageComments)
		.set({
			mdastJson,
			locale,
		})
		.where(
			and(eq(pageComments.id, pageCommentId), eq(pageComments.userId, userId)),
		)
		.returning();

	if (!updated) {
		throw new Error(`Failed to update page comment ${pageCommentId}`);
	}

	return updated;
}

/**
 * ページコメントを新規作成する（DB操作のみ）
 */
export async function createPageComment(
	tx: TransactionClient,
	pageId: number,
	userId: string,
	mdastJson: MdastRoot,
	locale: string,
	parentId: number | null,
): Promise<typeof pageComments.$inferSelect> {
	// 1. content行を作成
	const [content] = await tx
		.insert(contents)
		.values({ kind: "PAGE_COMMENT" })
		.returning({ id: contents.id });

	if (!content) {
		throw new Error("Failed to create content row");
	}

	// 2. ページコメントを作成
	const [created] = await tx
		.insert(pageComments)
		.values({
			id: content.id,
			pageId,
			userId,
			mdastJson,
			locale,
			parentId,
		})
		.returning();

	if (!created) {
		throw new Error("Failed to create page comment");
	}

	return created;
}

/**
 * 親コメントの返信数と最終返信時刻を更新する（DB操作のみ）
 */
export async function updateParentReplyCount(
	tx: TransactionClient,
	parentId: number,
	lastReplyAt: Date,
): Promise<void> {
	await tx
		.update(pageComments)
		.set({
			replyCount: sql`${pageComments.replyCount} + 1`,
			lastReplyAt,
		})
		.where(eq(pageComments.id, parentId));
}
