import { getCurrentUser } from "@/app/_service/auth-server";
import { apiSuccess } from "@/app/types/api-response";
import { fetchNotificationRowsWithRelations } from "@/app/api/notifications/_db/queries.server";

export async function GET() {
	const user = await getCurrentUser();
	if (!user) return apiSuccess({ notifications: [] });
	const notifications = await fetchNotificationRowsWithRelations(user.handle);
	return apiSuccess({ notifications });
}
