import { NextResponse } from "next/server";
import { fetchNotificationRowsWithRelations } from "@/app/api/notifications/_db/queries.server";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET() {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ notifications: [] });
	const notifications = await fetchNotificationRowsWithRelations(user.handle);
	return NextResponse.json({ notifications });
}
