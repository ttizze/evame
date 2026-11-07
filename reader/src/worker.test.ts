// @vitest-environment node
import type { ExecutionContext } from "@cloudflare/workers-types";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	purge: vi.fn(),
	astro: vi.fn(),
	asset: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ cache: { purge: mocks.purge } }));
vi.mock("@sentry/cloudflare", () => ({
	withSentry: (_options: unknown, handler: unknown) => handler,
}));
vi.mock("astro/fetch", () => ({
	astro: mocks.astro,
	FetchState: class {
		constructor(readonly request: Request) {}
	},
}));
vi.mock("@astrojs/cloudflare/fetch", () => ({
	cf: mocks.asset,
	finalize: (_state: unknown, response: Response) => response,
}));

import worker from "./worker";

const env = {} as typeof import("cloudflare:workers").env;
const context = {} as ExecutionContext;
const previewEnv = {
	PREVIEW_GATEWAY_ORIGIN: "https://pr-1140-evame-start.reimei.workers.dev",
	PREVIEW_READER_SECRET: "preview-reader-secret",
} as typeof env;

it.each([null, "wrong-secret"])(
	"PRのReaderは秘密値が%sの直接アクセスを拒否する",
	async (secret) => {
		const response = await worker.fetch(
			new Request("https://pr-1140-evame-reader.reimei.workers.dev/__purge", {
				method: "POST",
				headers: secret ? { "x-evame-preview-reader": secret } : {},
			}),
			previewEnv,
			context,
		);
		expect(response.status).toBe(404);
		expect(mocks.purge).not.toHaveBeenCalled();
		expect(mocks.astro).not.toHaveBeenCalled();
	},
);

it("PRのReaderはGatewayのURLとCookieで描画する", async () => {
	await worker.fetch(
		new Request("https://pr-1140-evame-reader.reimei.workers.dev/ja?page=2", {
			headers: {
				"x-evame-preview-reader": "preview-reader-secret",
				cookie: "preview-session",
			},
		}),
		previewEnv,
		context,
	);
	const state = mocks.astro.mock.calls[0][0];
	expect(state.request.url).toBe(
		"https://pr-1140-evame-start.reimei.workers.dev/ja?page=2",
	);
	expect(state.request.headers.get("cookie")).toBe("preview-session");
});
beforeEach(() => {
	mocks.purge.mockReset().mockResolvedValue({ success: true });
	mocks.astro.mockReset().mockResolvedValue(new Response("本文SSR"));
	mocks.asset.mockReset().mockResolvedValue(null);
});
it("保存後は指定された記事と一覧タグだけを削除しHTMLを生成しない", async () => {
	const tags = ["reader:" + "a".repeat(64), "reader:" + "b".repeat(64)];
	const response = await worker.fetch(
		new Request("https://reader.internal/__invalidate", {
			method: "POST",
			body: JSON.stringify({ tags }),
		}),
		env,
		context,
	);
	expect(response.status).toBe(204);
	expect(mocks.purge).toHaveBeenCalledExactlyOnceWith({ tags });
	expect(mocks.astro).not.toHaveBeenCalled();
});
it("更新前のGatewayから本文なしで呼ばれても全体を無効化できる", async () => {
	const response = await worker.fetch(
		new Request("https://reader.internal/__invalidate", { method: "POST" }),
		env,
		context,
	);
	expect(response.status).toBe(204);
	expect(mocks.purge).toHaveBeenCalledExactlyOnceWith({
		tags: ["evame-reader"],
	});
});
it("キャッシュの削除に失敗した場合は成功扱いにしない", async () => {
	mocks.purge.mockResolvedValue({ success: false });
	await expect(
		worker.fetch(
			new Request("https://reader.internal/__purge", { method: "POST" }),
			env,
			context,
		),
	).rejects.toThrow("Reader cache invalidation failed");
});
it("公開GETは事前生成せずAstroで本文を描画する", async () => {
	const response = await worker.fetch(
		new Request("https://evame.tech/ja/author/article"),
		env,
		context,
	);
	expect(await response.text()).toBe("本文SSR");
	expect(mocks.astro).toHaveBeenCalledOnce();
	expect(mocks.purge).not.toHaveBeenCalled();
});
it("ハッシュ付きアセットはAstroの描画へ渡さない", async () => {
	mocks.asset.mockResolvedValue(new Response("export {}"));
	const response = await worker.fetch(
		new Request("https://evame.tech/_astro/component.js"),
		env,
		context,
	);
	expect(await response.text()).toBe("export {}");
	expect(mocks.astro).not.toHaveBeenCalled();
});
it.each(["/__invalidate", "/__purge"])(
	"GET %sでは無効化を実行しない",
	async (path) => {
		expect(
			(
				await worker.fetch(
					new Request("https://reader.internal" + path),
					env,
					context,
				)
			).status,
		).toBe(405);
		expect(mocks.purge).not.toHaveBeenCalled();
	},
);
it("不正なタグを無効化へ渡さない", async () => {
	const response = await worker.fetch(
		new Request("https://reader.internal/__invalidate", {
			method: "POST",
			body: JSON.stringify({ tags: ["invalid"] }),
		}),
		env,
		context,
	);
	expect(response.status).toBe(400);
	expect(mocks.purge).not.toHaveBeenCalled();
});
