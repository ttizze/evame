import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { isSameOriginRequest } from "@/app/api/_utils/is-same-origin-request";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { markAllNotificationAsRead } from "./_db/mutations.server";
import { fetchNotificationRowsWithRelations } from "./_db/queries.server";

export async function getNotifications(request: Request): Promise<Response> {
	const user = await getCurrentUserFromHeaders(request.headers);
	if (!user) {
		return Response.json(
			{ notifications: [] },
			{ headers: PRIVATE_RESPONSE_HEADERS },
		);
	}

	const notifications = await fetchNotificationRowsWithRelations(user.handle);
	return Response.json(
		{ notifications },
		{ headers: PRIVATE_RESPONSE_HEADERS },
	);
}

export async function markNotificationsAsRead(
	request: Request,
): Promise<Response> {
	if (!isSameOriginRequest(request)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const user = await getCurrentUserFromHeaders(request.headers);
	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	await markAllNotificationAsRead(user.id);
	return Response.json({ success: true }, { status: 200 });
}
