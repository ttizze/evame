import { afterEach, describe, expect, it, vi } from "vitest";

describe("認証クライアントの接続先", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it("Viteの公開URLを設定するとそのサイトの認証APIへ接続する", async () => {
		vi.stubEnv("VITE_PUBLIC_DOMAIN", "https://preview.evame.tech");
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json(null));
		vi.stubGlobal("fetch", fetchMock);
		vi.resetModules();

		const { authClient } = await import("./auth-client");
		await authClient.getSession();

		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			"https://preview.evame.tech/api/auth/get-session",
		);
	});

	it("公開URLが未設定なら表示しているサイトの認証APIへ接続する", async () => {
		vi.stubEnv("VITE_PUBLIC_DOMAIN", undefined);
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json(null));
		vi.stubGlobal("fetch", fetchMock);
		vi.resetModules();

		const { authClient } = await import("./auth-client");
		await authClient.getSession();

		expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
			`${window.location.origin}/api/auth/get-session`,
		);
	});
});
