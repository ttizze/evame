import { describe, expect, it } from "vitest";
import { buildLoginUrl, parseCliRedirectUri } from "./redirect-uri";

describe("parseCliRedirectUri", () => {
	it("localhostのhttp URLは許可する", () => {
		expect(
			parseCliRedirectUri("http://127.0.0.1:12345/callback")?.toString(),
		).toBe("http://127.0.0.1:12345/callback");
		expect(
			parseCliRedirectUri("http://localhost:12345/callback")?.toString(),
		).toBe("http://localhost:12345/callback");
	});

	it("httpsや外部ホストは拒否する", () => {
		expect(parseCliRedirectUri("https://127.0.0.1:12345/callback")).toBeNull();
		expect(parseCliRedirectUri("http://example.com:12345/callback")).toBeNull();
	});
});

describe("buildLoginUrl", () => {
	it("redirect_uri を保持した next パラメータ付きログインURLを返す", () => {
		const requestUrl = new URL("http://localhost/api/sync/cli-login");
		const redirectUri = new URL("http://127.0.0.1:45678/callback");

		const loginUrl = buildLoginUrl(requestUrl, redirectUri);

		expect(loginUrl.origin).toBe("http://localhost");
		expect(loginUrl.pathname).toBe("/auth/login");
		expect(loginUrl.searchParams.get("next")).toBe(
			"/api/sync/cli-login?redirect_uri=http%3A%2F%2F127.0.0.1%3A45678%2Fcallback",
		);
	});
});
