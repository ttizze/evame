import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationAsRead() {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		redirect("/auth/login" as Route);
	}
	return prisma.notification.updateMany({
		where: { userId: currentUser.id },
		data: { read: true },
	});
}
