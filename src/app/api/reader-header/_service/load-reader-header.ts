import { fetchUnreadNotificationCount } from "@/app/api/_db/notifications/queries";
import { getAuth } from "@/auth";

export async function loadReaderHeader(headers: Headers) {
	const { response: session, headers: sessionHeaders } =
		await getAuth().api.getSession({ headers, returnHeaders: true });
	const user = session?.user;
	return {
		cookies: sessionHeaders.getSetCookie(),
		data: {
			user: user
				? {
						name: user.name,
						handle: user.handle,
						image: user.image,
						plan: user.plan,
						hasGeminiApiKey: user.hasGeminiApiKey,
					}
				: null,
			unreadCount: user ? await fetchUnreadNotificationCount(user.handle) : 0,
		},
	};
}
