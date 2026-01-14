import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/_service/auth-server";
import { db } from "@/db";

/**
 * すべての通知を既読にする
 * Kysely版に移行済み
 */
export async function markAllNotificationAsRead() {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		redirect("/auth/login" as Route);
	}

	await db
		.updateTable("notifications")
		.set({ read: true })
		.where("userId", "=", currentUser.id)
		.execute();
}
