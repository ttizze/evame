import { afterEach, describe, expect, it, vi } from "vitest";

const { createAuthClient } = vi.hoisted(() => ({
	createAuthClient: vi.fn(),
}));

vi.mock("better-auth/react", () => ({
	createAuthClient,
}));

vi.mock("better-auth/client/plugins", () => ({
	customSessionClient: vi.fn(() => ({})),
	magicLinkClient: vi.fn(() => ({})),
}));

async function loadAuthClient() {
	vi.resetModules();
	createAuthClient.mockClear();
	await import("./auth-client");
	return createAuthClient.mock.calls[0][0] as { baseURL: string | undefined };
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("authClient", () => {
	it("ブラウザでは設定済みドメインではなく現在のWorker originへ認証リクエストを送る", async () => {
		vi.stubEnv("NEXT_PUBLIC_DOMAIN", "https://evame.tech");
		vi.stubGlobal("window", {
			location: { origin: "https://evame.reimei.workers.dev" },
		});

		const options = await loadAuthClient();

		expect(options.baseURL).toBe("https://evame.reimei.workers.dev");
	});

	it("SSRでは設定済みドメインを認証サーバーURLとして使う", async () => {
		vi.stubEnv("NEXT_PUBLIC_DOMAIN", "https://evame.tech");
		vi.stubGlobal("window", undefined);

		const options = await loadAuthClient();

		expect(options.baseURL).toBe("https://evame.tech");
	});
});
