// @vitest-environment node
import type { ExecutionContext } from "@cloudflare/workers-types";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	astro: vi.fn(),
	asset: vi.fn(),
	finalize: vi.fn(),
}));
vi.mock("astro/fetch", () => ({
	astro: mocks.astro,
	FetchState: class {
		constructor(readonly request: Request) {}
	},
}));
vi.mock("@astrojs/cloudflare/fetch", () => ({
	cf: mocks.asset,
	finalize: mocks.finalize,
}));

import worker from "./worker";

const env = {} as typeof import("cloudflare:workers").env;
const context = { waitUntil: vi.fn() } as unknown as ExecutionContext;
beforeEach(() => {
	mocks.astro.mockReset().mockResolvedValue(new Response("本文SSR"));
	mocks.asset.mockReset().mockResolvedValue(null);
	mocks.finalize.mockReset().mockImplementation((_state, response) => response);
});
it("公開ページは元のURLとCookieを保ってAstroで本文を描画する", async () => {
	const request = new Request(
		"https://evame.tech/ja/author/article?view=source",
		{ headers: { cookie: "session" } },
	);
	const response = await worker.fetch(request, env, context);
	expect(await response.text()).toBe("本文SSR");
	expect(response.headers.get("X-Evame-HTML")).toBe("astro");
	expect(mocks.astro.mock.calls[0][0].request).toBe(request);
	expect(mocks.finalize).toHaveBeenCalledOnce();
});
it("アセットの応答がある場合はAstroの描画を実行しない", async () => {
	const asset = new Response("export {}");
	mocks.asset.mockResolvedValue(asset);
	expect(
		await worker.fetch(
			new Request("https://evame.tech/_astro/client.js"),
			env,
			context,
		),
	).toBe(asset);
	expect(mocks.astro).not.toHaveBeenCalled();
	expect(mocks.finalize).not.toHaveBeenCalled();
});
it("Astroが失敗した場合は失敗を呼び出し元へ返す", async () => {
	mocks.astro.mockRejectedValue(new Error("SSR failed"));
	await expect(
		worker.fetch(new Request("https://evame.tech/ja"), env, context),
	).rejects.toThrow("SSR failed");
});
