import { getCurrentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
export async function markAllNotificationAsRead() {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	return prisma.notification.updateMany({
		where: { userId: currentUser.id },
		data: { read: true },
	});
}
