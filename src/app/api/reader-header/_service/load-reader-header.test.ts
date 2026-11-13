import { expect, it, vi } from "vitest";
import { loadReaderHeader } from "./load-reader-header";

const session = vi.hoisted(() => vi.fn());
const notifications = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({
	getAuth: () => ({ api: { getSession: session } }),
}));
vi.mock("@/app/api/_db/notifications/queries", () => ({
	fetchUnreadNotificationCount: notifications,
}));

it("本人のヘッダーに必要な情報と通知だけを返し、認証セッションは返さない", async () => {
	session.mockResolvedValueOnce({
		response: {
			user: {
				id: "alice",
				name: "Alice",
				handle: "alice",
				image: "/avatar.png",
				plan: "free",
				hasGeminiApiKey: false,
				email: "private@example.test",
			},
		},
		headers: new Headers({
			"Set-Cookie": "better-auth.session_token=renewed; Path=/; HttpOnly",
		}),
	});
	notifications.mockResolvedValueOnce(1);
	const result = await loadReaderHeader(
		new Headers({ cookie: "test-session" }),
	);
	expect(result.data).toEqual({
		user: {
			name: "Alice",
			handle: "alice",
			image: "/avatar.png",
			plan: "free",
			hasGeminiApiKey: false,
		},
		unreadCount: 1,
	});
	expect(result.cookies).toEqual([
		"better-auth.session_token=renewed; Path=/; HttpOnly",
	]);
	expect(notifications).toHaveBeenCalledWith("alice");
	expect(session).toHaveBeenCalledWith({
		headers: expect.any(Headers),
		returnHeaders: true,
	});
});

it("未ログインではログイン前のヘッダーを返す", async () => {
	session.mockResolvedValueOnce({ response: null, headers: new Headers() });
	expect(await loadReaderHeader(new Headers())).toEqual({
		data: { user: null, unreadCount: 0 },
		cookies: [],
	});
});
