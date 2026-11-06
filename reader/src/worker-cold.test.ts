// @vitest-environment node
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runtime: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ cache: { purge: vi.fn() } }));
vi.mock("@sentry/cloudflare", () => ({
	withSentry: (_options: unknown, handler: unknown) => handler,
}));
vi.mock("astro/fetch", () => {
	mocks.runtime();
	return { astro: vi.fn(), FetchState: class {} };
});
vi.mock("@astrojs/cloudflare/fetch", () => ({
	cf: vi.fn(),
	finalize: vi.fn(),
}));

it("初めてのリクエストでも生成済み本文の配信にはAstroの描画コードを読み込まない", async () => {
	const { default: worker } = await import("./worker");
	const env = {
		READER_HTML: {
			get: async () => ({
				body: "生成済み本文",
				customMetadata: { status: "200" },
			}),
		},
	} as unknown as Parameters<typeof worker.fetch>[1];
	const response = await worker.fetch(
		new Request("https://evame.tech/ja/author/article"),
		env,
		{} as Parameters<typeof worker.fetch>[2],
	);
	expect(await response.text()).toBe("生成済み本文");
	expect(response.headers.get("X-Evame-HTML")).toBe("generated");
	expect(mocks.runtime).not.toHaveBeenCalled();
});
