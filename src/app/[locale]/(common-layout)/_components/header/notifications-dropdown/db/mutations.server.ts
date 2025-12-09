import type { Route } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db/kysely";
import { getCurrentUser } from "@/lib/auth-server";

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
