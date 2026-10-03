import { db } from "@/db";

/** ページコメント通知を作成する（DB操作のみ）。 */
export async function createNotificationPageComment(
	actorId: string,
	userId: string,
	pageCommentId: number,
) {
	return db
		.insertInto("notifications")
		.values({
			userId,
			type: "PAGE_COMMENT",
			pageCommentId,
			actorId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}
