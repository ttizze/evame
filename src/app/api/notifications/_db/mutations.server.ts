import { db } from "@/db";

/**
 * 指定されたユーザーの通知をすべて既読にする
 */
export async function markAllNotificationAsRead(userId: string) {
	await db
		.updateTable("notifications")
		.set({ read: true })
		.where("userId", "=", userId)
		.execute();
}
