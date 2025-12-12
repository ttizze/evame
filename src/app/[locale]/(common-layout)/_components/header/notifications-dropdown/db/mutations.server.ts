import { eq } from "drizzle-orm";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { db } from "@/drizzle";
import { notifications } from "@/drizzle/schema";
import { getCurrentUser } from "@/lib/auth-server";

/**
 * すべての通知を既読にする
 * Drizzle版に移行済み
 */
export async function markAllNotificationAsRead() {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		redirect("/auth/login" as Route);
	}

	await db
		.update(notifications)
		.set({ read: true })
		.where(eq(notifications.userId, currentUser.id));
}
