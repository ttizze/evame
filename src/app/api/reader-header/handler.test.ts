import { beforeEach, expect, it, vi } from "vitest";
import { getReaderHeaderData } from "./handler";

const load = vi.hoisted(() => vi.fn());
vi.mock("./_service/load-reader-header", () => ({ loadReaderHeader: load }));
beforeEach(() => vi.clearAllMocks());

it("セッション延長と古い認証情報の削除のCookieを本人のブラウザーへ返す", async () => {
	const cookies = [
		"better-auth.session_token=renewed; Path=/; HttpOnly",
		"better-auth.session_data=; Path=/; Max-Age=0",
	];
	load.mockResolvedValueOnce({ data: { user: null, unreadCount: 0 }, cookies });
	const response = await getReaderHeaderData(
		new Request("https://evame.test/api/reader-header?locale=ja"),
	);
	expect(response.headers.getSetCookie()).toEqual(cookies);
	expect(await response.json()).toEqual({
		user: null,
		unreadCount: 0,
		unreadDescription: "",
	});
});

it.each(["", "?locale=invalid"])(
	"言語が不正な%sでは認証や通知を取得しない",
	async (search) => {
		const response = await getReaderHeaderData(
			new Request(`https://evame.test/api/reader-header${search}`),
		);
		expect(response.status).toBe(400);
		expect(response.headers.get("Cache-Control")).toContain("no-store");
		expect(load).not.toHaveBeenCalled();
	},
);

it("本人の通知件数を翻訳し、Cookieや認証情報による応答を共有キャッシュへ保存させない", async () => {
	load.mockResolvedValueOnce({
		data: { user: null, unreadCount: 3 },
		cookies: [],
	});
	const request = new Request(
		"https://evame.test/api/reader-header?locale=ja",
		{ headers: { cookie: "test-session" } },
	);
	const response = await getReaderHeaderData(request);
	expect(load).toHaveBeenCalledWith(request.headers);
	expect(await response.json()).toEqual({
		user: null,
		unreadCount: 3,
		unreadDescription: "未読通知3件",
	});
	expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	expect(response.headers.get("Vary")).toBe("Cookie, Authorization");
});
