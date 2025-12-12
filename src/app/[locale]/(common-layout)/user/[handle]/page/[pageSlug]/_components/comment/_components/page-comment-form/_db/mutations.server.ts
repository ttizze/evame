import { db } from "@/drizzle";
import { notifications } from "@/drizzle/schema";

/**
 * ページコメント通知を作成（DB操作のみ）
 * Drizzle版に移行済み
 */
export async function createNotificationPageComment(
	actorId: string,
	userId: string,
	pageCommentId: number,
) {
	const [notification] = await db
		.insert(notifications)
		.values({
			userId: userId,
			type: "PAGE_COMMENT",
			pageCommentId,
			actorId: actorId,
		})
		.returning();
	return notification;
}
