import { afterEach, describe, expect, it, vi } from "vitest";

describe("公開サイトURL", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("VITE_PUBLIC_DOMAINを公開サイトURLとして使う", async () => {
		vi.stubEnv("VITE_PUBLIC_DOMAIN", "https://preview.evame.tech");
		vi.resetModules();

		const { BASE_URL } = await import("./base-url");

		expect(BASE_URL).toBe("https://preview.evame.tech");
	});
});
