import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { fetchNotificationRowsWithRelations } from "./_db/queries.server";

export async function getNotifications(request: Request): Promise<Response> {
	const user = await getCurrentUserFromHeaders(request.headers);
	if (!user) return Response.json({ notifications: [] });

	const notifications = await fetchNotificationRowsWithRelations(user.handle);
	return Response.json({ notifications });
}
