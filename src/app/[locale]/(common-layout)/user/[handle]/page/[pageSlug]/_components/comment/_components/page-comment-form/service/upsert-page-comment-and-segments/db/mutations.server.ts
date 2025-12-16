import { sql } from "kysely";
import type { Root as MdastRoot } from "mdast";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";

type PageCommentRecord = {
	id: number;
	pageId: number;
	userId: string;
	locale: string;
	parentId: number | null;
	mdastJson: MdastRoot;
	isDeleted: boolean;
	replyCount: number;
	lastReplyAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * ページコメントを更新する（DB操作のみ）
 */
export async function updatePageComment(
	tx: TransactionClient,
	pageCommentId: number,
	userId: string,
	mdastJson: MdastRoot,
	locale: string,
): Promise<PageCommentRecord> {
	const updated = await tx
		.updateTable("pageComments")
		.set({
			mdastJson,
			locale,
		})
		.where("id", "=", pageCommentId)
		.where("userId", "=", userId)
		.returningAll()
		.executeTakeFirst();

	if (!updated) {
		throw new Error(`Failed to update page comment ${pageCommentId}`);
	}

	return updated as PageCommentRecord;
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
): Promise<PageCommentRecord> {
	// 1. content行を作成
	const content = await tx
		.insertInto("contents")
		.values({ kind: "PAGE_COMMENT" })
		.returning(["id"])
		.executeTakeFirstOrThrow();

	// 2. ページコメントを作成
	const created = await tx
		.insertInto("pageComments")
		.values({
			id: content.id,
			pageId,
			userId,
			mdastJson,
			locale,
			parentId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return created as PageCommentRecord;
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
		.updateTable("pageComments")
		.set({
			replyCount: sql`reply_count + 1`,
			lastReplyAt,
		})
		.where("id", "=", parentId)
		.execute();
}
