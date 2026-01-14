import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/_service/auth-server";
import { fetchNotificationRowsWithRelations } from "@/app/api/notifications/_db/queries.server";

export async function GET() {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ notifications: [] });
	const notifications = await fetchNotificationRowsWithRelations(user.handle);
	return NextResponse.json({ notifications });
}
