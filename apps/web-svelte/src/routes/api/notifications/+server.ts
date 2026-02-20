import { json, type RequestHandler } from "@sveltejs/kit";
import { fetchNotificationRowsWithRelations } from "@/app/api/notifications/_db/queries.server";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ notifications: [] });
	}

	const notifications = await fetchNotificationRowsWithRelations(
		locals.user.handle,
	);
	return json({ notifications });
};
