// @vitest-environment node
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { db, disposeDb } from "./db";
import { setupDbPerFile } from "./tests/test-db-manager";

const send = vi.hoisted(() => vi.fn());
vi.mock("./utils/send-magic-link-email.server", () => ({
	sendMagicLinkEmail: send,
}));
const origin = "https://evame-pr-1140.reimei.workers.dev";
vi.stubEnv("BETTER_AUTH_URL", origin);
vi.stubEnv(
	"BETTER_AUTH_SECRET",
	"preview-isolated-login-test-secret-32-characters",
);
await setupDbPerFile(import.meta.url);
beforeEach(() => send.mockClear());
afterAll(async () => {
	await disposeDb();
	vi.unstubAllEnvs();
});

it("HTTPSのPR環境で発行したログインリンクから安全なCookieを設定して再ログインできる", async () => {
	const { getAuth } = await import("./auth");
	const auth = getAuth();
	const response = await auth.handler(
		new Request(`${origin}/api/auth/sign-in/magic-link`, {
			method: "POST",
			headers: { origin, "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "preview-login@example.test",
				callbackURL: "/ja",
			}),
		}),
	);
	expect(response.status).toBe(200);
	expect(send).toHaveBeenCalledOnce();
	const verificationURL = new URL(send.mock.calls[0][1]);
	expect(verificationURL.origin).toBe(origin);
	const verified = await auth.handler(new Request(verificationURL));
	expect(verified.status).toBe(302);
	expect(verified.headers.get("location")).toBe(`${origin}/ja`);
	const cookies = verified.headers.getSetCookie();
	expect(
		cookies.some(
			(cookie) =>
				cookie.includes("__Secure-better-auth.session_token=") &&
				cookie.includes("Secure"),
		),
	).toBe(true);
	expect(cookies.every((value) => !/domain=/i.test(value))).toBe(true);
	const cookie = cookies.map((value) => value.split(";")[0]).join("; ");
	const session = await auth.handler(
		new Request(`${origin}/api/auth/get-session`, { headers: { cookie } }),
	);
	expect(session.status).toBe(200);
	const user = await db
		.selectFrom("users")
		.select("id")
		.where("email", "=", "preview-login@example.test")
		.executeTakeFirstOrThrow();
	expect((await session.json()).user.id).toBe(user.id);
});

it("Cookieがあるブラウザの別サイトOriginからPR環境のログインリンクを発行しない", async () => {
	const { getAuth } = await import("./auth");
	const response = await getAuth().handler(
		new Request(`${origin}/api/auth/sign-in/magic-link`, {
			method: "POST",
			headers: {
				origin: "https://evame.tech",
				cookie: "__Secure-better-auth.session_token=existing-browser-cookie",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email: "preview-login@example.test",
				callbackURL: "/ja",
			}),
		}),
	);
	expect(response.status).toBe(403);
	expect(send).not.toHaveBeenCalled();
});
