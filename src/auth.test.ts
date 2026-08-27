import { resolveBaseURL } from "better-auth";
import { describe, expect, it } from "vitest";
import { auth } from "./auth";

describe("認証サーバーの公開origin", () => {
	it("Workers・Vercel・localhostだけをmagic linkの送信元として許可する", () => {
		expect(auth.options.baseURL).toEqual({
			allowedHosts: [
				"evame.reimei.workers.dev",
				"evame.tech",
				"localhost",
				"localhost:*",
			],
		});
	});

	it.each([
		["Workers", "https://evame.reimei.workers.dev/api/auth/sign-in/magic-link"],
		["Vercel", "https://evame.tech/api/auth/sign-in/magic-link"],
		["localhost", "http://localhost:3000/api/auth/sign-in/magic-link"],
	])("%sへのリクエストでは同じoriginのmagic linkを生成する", (_, requestUrl) => {
		const baseURL = resolveBaseURL(
			auth.options.baseURL,
			"/api/auth",
			new Request(requestUrl),
		);

		expect(baseURL).toBeDefined();
		expect(new URL(baseURL as string).origin).toBe(new URL(requestUrl).origin);
	});

	it("許可していないhostではmagic linkのoriginを解決しない", () => {
		expect(() =>
			resolveBaseURL(
				auth.options.baseURL,
				"/api/auth",
				new Request("https://untrusted.example/api/auth/sign-in/magic-link"),
			),
		).toThrow();
	});
});
