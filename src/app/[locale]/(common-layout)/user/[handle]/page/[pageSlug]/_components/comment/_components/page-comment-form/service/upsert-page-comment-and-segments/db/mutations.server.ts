import { sql } from "kysely";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import type { JsonValue } from "@/db/types";
import type { PageComment } from "@/db/types.helpers";

/**
 * ページコメントを更新する（DB操作のみ）
 */
export async function updatePageComment(
	tx: TransactionClient,
	pageCommentId: number,
	userId: string,
	mdastJson: JsonValue,
	locale: string,
): Promise<PageComment> {
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

	return updated;
}

/**
 * ページコメントを新規作成する（DB操作のみ）
 */
export async function createPageComment(
	tx: TransactionClient,
	pageId: number,
	userId: string,
	mdastJson: JsonValue,
	locale: string,
	parentId: number | null,
): Promise<PageComment> {
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
		.updateTable("pageComments")
		.set({
			replyCount: sql`reply_count + 1`,
			lastReplyAt,
		})
		.where("id", "=", parentId)
		.execute();
}
