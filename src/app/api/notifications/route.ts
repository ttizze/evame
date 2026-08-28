import { getNotifications, markNotificationsAsRead } from "./handler";

export async function GET(request: Request) {
	return getNotifications(request);
}

export async function POST(request: Request) {
	return markNotificationsAsRead(request);
}
