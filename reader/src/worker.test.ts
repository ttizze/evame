// @vitest-environment node
import type { ExecutionContext } from "@cloudflare/workers-types";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	publication: vi.fn(),
	purge: vi.fn(),
	get: vi.fn(),
	backend: vi.fn(),
	astro: vi.fn(),
	sources: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ cache: { purge: mocks.purge } }));
vi.mock("@sentry/cloudflare", () => ({
	withSentry: (_config: unknown, handler: unknown) => handler,
}));
vi.mock("./publication", () => ({ publishReaderDocuments: mocks.publication }));
vi.mock("./source-revisions", () => ({
	updateReaderSources: mocks.sources,
}));
vi.mock("astro/fetch", () => ({ astro: mocks.astro, FetchState: class {} }));
vi.mock("@astrojs/cloudflare/fetch", () => ({
	cf: async () => null,
	finalize: (_state: unknown, response: Response) => response,
}));

import worker from "./worker";

const env = {
	CF_VERSION_METADATA: { id: "deployment-version" },
	BACKEND: { fetch: mocks.backend },
	READER_HTML: { get: mocks.get },
} as unknown as typeof import("cloudflare:workers").env;
const context = { waitUntil: vi.fn() } as unknown as ExecutionContext;
beforeEach(() => {
	mocks.publication
		.mockReset()
		.mockResolvedValue({ remaining: 0, generated: 0 });
	mocks.purge.mockReset().mockResolvedValue({ success: true });
	mocks.get.mockReset().mockResolvedValue(null);
	mocks.sources.mockReset().mockResolvedValue({});
	mocks.backend
		.mockReset()
		.mockImplementation(async () =>
			Response.json({ revision: 1, documents: {} }),
		);
	mocks.astro
		.mockReset()
		.mockImplementation(async () => new Response("所有者プレビュー"));
});
afterEach(() => vi.useRealTimers());

it("保存前のDBの版より後に変わった生成元だけを、その言語の更新対象へ渡す", async () => {
	mocks.sources.mockResolvedValue({ "/author/a": 2, "/author/b": 3 });
	mocks.backend.mockResolvedValue(
		Response.json({
			revision: 3,
			documents: { "/en/author/a": "a", "/en/author/b": "b" },
			sources: {},
		}),
	);
	await worker.fetch(
		new Request("https://reader.internal/__invalidate", {
			method: "POST",
			headers: {
				"X-Evame-Reader-Since": "2",
				"X-Evame-Reader-Locale": "en",
				"X-Evame-Reader-Batch": "true",
			},
		}),
		env,
		context,
	);
	expect(mocks.publication.mock.calls[0]?.[7]).toEqual(new Set(["/author/b"]));
});

it("後続デプロイに置き換えられた旧Workerは再試行して新版を巻き戻さない", async () => {
	mocks.publication.mockRejectedValue(
		new Error("Reader deployment superseded"),
	);
	await expect(
		worker.fetch(
			new Request("https://reader.internal/__publish", { method: "POST" }),
			env,
			context,
		),
	).rejects.toThrow("deployment superseded");
	expect(mocks.publication).toHaveBeenCalledOnce();
	expect(mocks.purge).toHaveBeenCalledOnce();
});

it("公開の競合が続く場合は5回で停止し、共有キャッシュを無効化してエラーを返す", async () => {
	mocks.publication.mockRejectedValue(new Error("上限を超えた再試行"));
	for (let attempt = 0; attempt < 5; attempt++)
		mocks.publication.mockRejectedValueOnce(
			new Error("Reader publication superseded"),
		);
	vi.useFakeTimers();
	const finished = expect(
		worker.fetch(
			new Request("https://reader.internal/__publish", {
				method: "POST",
				headers: { "X-Evame-Reader-Locale": "pi" },
			}),
			env,
			context,
		),
	).rejects.toThrow("superseded");
	await vi.advanceTimersByTimeAsync(10000);
	expect(mocks.publication).toHaveBeenCalledTimes(5);
	await finished;
	expect(mocks.purge).toHaveBeenCalledOnce();
});

it("一時的な公開競合では最新のカタログを取得し直して完了する", async () => {
	mocks.publication.mockRejectedValueOnce(
		new Error("Reader publication superseded"),
	);
	vi.useFakeTimers();
	const finished = worker.fetch(
		new Request("https://reader.internal/__publish", {
			method: "POST",
			headers: { "X-Evame-Reader-Locale": "pi" },
		}),
		env,
		context,
	);
	await vi.runAllTimersAsync();
	const response = await finished;
	expect(response.status).toBe(200);
	expect(mocks.backend).toHaveBeenCalledTimes(2);
	expect(mocks.publication.mock.calls[1]?.[1]).toBe("deployment-version");
});

it.each(["", "NEXT_LOCALE=ja", "_ga=analytics; NEXT_LOCALE=ja"])(
	"非認証Cookieでも生成済み404をDBなしで返す（%s）",
	async (cookie) => {
		mocks.get.mockResolvedValue({
			body: "見つかりません",
			customMetadata: { status: "404" },
		});
		const response = await worker.fetch(
			new Request("https://evame.tech/ja/author/article", {
				headers: { cookie },
			}),
			env,
			context,
		);
		expect(response.status).toBe(404);
		expect(response.headers.get("X-Evame-HTML")).toBe("generated");
		expect(mocks.astro).not.toHaveBeenCalled();
		expect(mocks.backend).not.toHaveBeenCalled();
	},
);

it.each([
	"better-auth.session_token=token",
	"__Secure-better-auth.session_token=token",
])(
	"生成済み404があっても認証Cookieを持つ所有者のプレビューへ進む（%s）",
	async (cookie) => {
		mocks.get.mockResolvedValue({
			body: "見つかりません",
			customMetadata: { status: "404" },
		});
		const response = await worker.fetch(
			new Request("https://evame.tech/ja/author/article", {
				headers: { cookie },
			}),
			env,
			context,
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("X-Evame-HTML")).toBe("dynamic");
		expect(await response.text()).toBe("所有者プレビュー");
	},
);
