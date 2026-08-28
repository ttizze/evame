import { getNotifications } from "./handler";

export async function GET(request: Request) {
	return getNotifications(request);
}
