// @vitest-environment node
import { afterAll, expect, it, vi } from "vitest";
import { disposeDb } from "./db";
import { setupDbPerFile } from "./tests/test-db-manager";

const send = vi.hoisted(() => vi.fn());
vi.mock("./utils/send-magic-link-email.server", () => ({
	sendMagicLinkEmail: send,
}));
vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
vi.stubEnv(
	"BETTER_AUTH_SECRET",
	"turso-login-test-secret-at-least-32-characters",
);
await setupDbPerFile(import.meta.url);
afterAll(async () => {
	await disposeDb();
	vi.unstubAllEnvs();
});

it("マジックリンクでログインし、SQLiteのセッションを再取得できる", async () => {
	const { getAuth } = await import("./auth");
	const auth = getAuth();
	const signIn = await auth.handler(
		new Request("http://localhost:3000/api/auth/sign-in/magic-link", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "http://localhost:3000",
			},
			body: JSON.stringify({
				email: "turso-login@example.test",
				name: "Turso User",
				callbackURL: "/ja",
			}),
		}),
	);
	expect(signIn.status).toBe(200);
	expect(send).toHaveBeenCalledOnce();
	const verifyUrl = send.mock.calls[0][1];
	const verified = await auth.handler(new Request(verifyUrl));
	expect(verified.status).toBe(302);
	const cookie = verified.headers
		.getSetCookie()
		.map((value) => value.split(";")[0])
		.join("; ");
	expect(cookie).toContain("better-auth.session_token=");
	for (let attempt = 0; attempt < 2; attempt++) {
		const response = await auth.handler(
			new Request("http://localhost:3000/api/auth/get-session", {
				headers: { cookie },
			}),
		);
		expect(response.status).toBe(200);
		expect((await response.json()).user.name).toBe("Turso User");
	}
});
