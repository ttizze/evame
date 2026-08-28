import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { markAllNotificationAsRead } from "./_db/mutations.server";
import { fetchNotificationRowsWithRelations } from "./_db/queries.server";

export async function getNotifications(request: Request): Promise<Response> {
	const user = await getCurrentUserFromHeaders(request.headers);
	if (!user) return Response.json({ notifications: [] });

	const notifications = await fetchNotificationRowsWithRelations(user.handle);
	return Response.json({ notifications });
}

export async function markNotificationsAsRead(
	request: Request,
): Promise<Response> {
	const origin = request.headers.get("origin");
	if (origin && origin !== new URL(request.url).origin) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const user = await getCurrentUserFromHeaders(request.headers);
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	await markAllNotificationAsRead(user.id);
	return Response.json({ success: true }, { status: 200 });
}
