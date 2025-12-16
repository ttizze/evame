import { db } from "@/db";

/**
 * ページコメント通知を作成（DB操作のみ）
 * Kysely版に移行済み
 */
export async function createNotificationPageComment(
	actorId: string,
	userId: string,
	pageCommentId: number,
) {
	const notification = await db
		.insertInto("notifications")
		.values({
			userId: userId,
			type: "PAGE_COMMENT",
			pageCommentId,
			actorId: actorId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return notification;
}
