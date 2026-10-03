// @vitest-environment node
import { exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let credentials: string;
let publicKey: CryptoKey;
beforeAll(async () => {
	const keyPair = await generateKeyPair("RS256", { extractable: true });
	publicKey = keyPair.publicKey;
	credentials = JSON.stringify({
		client_email: "test@example.test",
		private_key: await exportPKCS8(keyPair.privateKey),
	});
});
beforeEach(() => vi.resetModules());
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("WorkersからGoogleのアクセストークンを取得する", () => {
	it("サービスアカウントでJWTを署名し、取得したトークンを有効期限内だけ再利用する", async () => {
		vi.stubEnv("GCP_SERVICE_ACCOUNT_CREDENTIALS", credentials);
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(async () =>
				Response.json({ access_token: "dummy-access-token", expires_in: 3600 }),
			);
		vi.stubGlobal("fetch", fetch);
		const { getGoogleAccessToken } = await import("./google-auth");
		expect(await getGoogleAccessToken()).toBe("dummy-access-token");
		expect(await getGoogleAccessToken()).toBe("dummy-access-token");
		expect(fetch).toHaveBeenCalledOnce();
		const [url, options] = fetch.mock.calls[0];
		expect(url).toBe("https://oauth2.googleapis.com/token");
		if (!(options?.body instanceof URLSearchParams))
			throw new Error("OAuthのパラメータがない");
		const params = options.body;
		const assertion = params.get("assertion");
		if (!assertion) throw new Error("署名したJWTがない");
		const { payload } = await jwtVerify(assertion, publicKey, {
			issuer: "test@example.test",
			audience: "https://oauth2.googleapis.com/token",
		});
		expect(payload.scope).toBe(
			"https://www.googleapis.com/auth/cloud-platform",
		);
		vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3600 * 1000);
		expect(await getGoogleAccessToken()).toBe("dummy-access-token");
		expect(fetch).toHaveBeenCalledTimes(2);
	});
	it.each(["", "dummy-secret-malformed-json"])(
		"認証が未設定または壊れていても秘密をエラーに含めない",
		async (value) => {
			vi.stubEnv("GCP_SERVICE_ACCOUNT_CREDENTIALS", value);
			const { getGoogleAccessToken } = await import("./google-auth");
			await expect(getGoogleAccessToken()).rejects.toThrow(
				"GCP service account credentials are not configured correctly",
			);
		},
	);
	it("Googleの認証失敗を通知する", async () => {
		vi.stubEnv("GCP_SERVICE_ACCOUNT_CREDENTIALS", credentials);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("invalid grant", { status: 401 })),
		);
		const { getGoogleAccessToken } = await import("./google-auth");
		await expect(getGoogleAccessToken()).rejects.toThrow(
			"Google authentication failed (401)",
		);
	});
});
