import { describe, expect, it } from "vitest";
import {
	clearSessionCookie,
	getSessionTokenFromRequest,
	SESSION_COOKIE_MAX_AGE_SECONDS,
	SESSION_COOKIE_NAME,
	serializeSessionCookie,
} from "./cookies";

describe("セッションCookie", () => {
	it("Digital Buddhism用のCookie名を使う", () => {
		expect(SESSION_COOKIE_NAME).toBe("digital_buddhism_session");
	});

	it("HttpOnly・Secure・SameSite=Laxの属性を付ける", () => {
		const header = serializeSessionCookie("session-token");

		expect(header).toContain(`${SESSION_COOKIE_NAME}=session-token`);
		expect(header).toContain("Path=/");
		expect(header).toContain(`Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`);
		expect(header).toContain("HttpOnly");
		expect(header).toContain("Secure");
		expect(header).toContain("SameSite=Lax");
	});

	it("RequestのCookieからセッション値だけを取り出す", () => {
		const request = new Request("https://evame.example/", {
			headers: {
				cookie: `other=value; ${SESSION_COOKIE_NAME}=session-token`,
			},
		});

		expect(getSessionTokenFromRequest(request)).toBe("session-token");
	});

	it("ログアウトCookieは即時失効し安全属性を維持する", () => {
		const header = clearSessionCookie();

		expect(header).toContain(`${SESSION_COOKIE_NAME}=`);
		expect(header).toContain("Max-Age=0");
		expect(header).toContain("HttpOnly");
		expect(header).toContain("Secure");
		expect(header).toContain("SameSite=Lax");
	});
});
