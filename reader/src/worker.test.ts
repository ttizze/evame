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
	self: vi.fn(),
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
	CF_VERSION_METADATA: {
		id: "deployment-version",
		timestamp: "2026-11-06T00:00:00.000Z",
	},
	SELF: { fetch: mocks.self },
	BACKEND: { fetch: mocks.backend },
	READER_HTML: { get: mocks.get },
} as unknown as typeof import("cloudflare:workers").env;
const context = { waitUntil: vi.fn() } as unknown as ExecutionContext;
beforeEach(() => {
	mocks.self.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
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

it("DB接続を使い切らないように同時に生成する言語を4つまでにする", async () => {
	const release = Promise.withResolvers<void>();
	let active = 0;
	let maximum = 0;
	mocks.self
		.mockReset()
		.mockResolvedValueOnce(new Response(null, { status: 204 }));
	mocks.self.mockImplementation(async () => {
		maximum = Math.max(maximum, ++active);
		await release.promise;
		active--;
		return new Response(null, { status: 204 });
	});
	const done = worker.fetch(
		new Request("https://reader.internal/__invalidate", { method: "POST" }),
		env,
		context,
	);
	await vi.waitFor(() =>
		expect(mocks.self.mock.calls.length).toBeGreaterThanOrEqual(5),
	);
	const started = mocks.self.mock.calls.length;
	release.resolve();
	await done;
	expect(started).toBe(5);
	expect(maximum).toBe(4);
	expect(mocks.self).toHaveBeenCalledTimes(21);
});

it("毎時の再生成も全言語の内容更新へ渡し、デプロイ用の一括生成とは競合させない", async () => {
	await worker.scheduled({} as Parameters<typeof worker.scheduled>[0], env);
	expect(mocks.self).toHaveBeenCalledExactlyOnceWith(
		"https://reader.internal/__invalidate",
		{ method: "POST" },
	);
});

it("デプロイ後のpurgeはReader自身が実行し、失敗したら完了を返さない", async () => {
	mocks.purge.mockResolvedValue({ success: false });
	await expect(
		worker.fetch(
			new Request("https://reader.internal/__purge", { method: "POST" }),
			env,
			context,
		),
	).rejects.toThrow("Reader cache invalidation failed");
	expect(mocks.publication).not.toHaveBeenCalled();
});

it("最初のバッチ後に各言語を並行生成し、遅い言語の完了後に一度だけ共有キャッシュを消す", async () => {
	const slow = Promise.withResolvers<Response>();
	const self = mocks.self;
	self.mockReset().mockImplementation(async (_url, options) => {
		const locale = new Headers(options?.headers).get("X-Evame-Reader-Locale");
		return locale === "en" ? slow.promise : new Response(null, { status: 204 });
	});
	let finished = false;
	const result = worker
		.fetch(
			new Request("https://reader.internal/__invalidate", {
				method: "POST",
				headers: { "X-Evame-Reader-Since": "1" },
			}),
			env,
			context,
		)
		.then((response) => {
			finished = true;
			return response;
		});
	await vi.waitFor(() => expect(self).toHaveBeenCalledTimes(21));
	expect(finished).toBe(false);
	expect(mocks.purge).not.toHaveBeenCalled();
	for (const [, options] of self.mock.calls) {
		expect(
			new Headers(options?.headers).get("X-Evame-Reader-Defer-Purge"),
		).toBe("true");
	}
	slow.resolve(new Response(null, { status: 204 }));
	expect((await result).status).toBe(204);
	expect(mocks.purge).toHaveBeenCalledOnce();
});

it("一言語が失敗しても他言語の書き込み完了を待ってからキャッシュを消しエラーにする", async () => {
	const slow = Promise.withResolvers<Response>();
	mocks.self.mockReset().mockImplementation(async (_url, options) => {
		const locale = new Headers(options?.headers).get("X-Evame-Reader-Locale");
		return locale === "en"
			? slow.promise
			: new Response(null, { status: locale === "zh" ? 500 : 204 });
	});
	const result = expect(
		worker.fetch(
			new Request("https://reader.internal/__invalidate", { method: "POST" }),
			env,
			context,
		),
	).rejects.toThrow("Reader publication failed");
	await vi.waitFor(() => expect(env.SELF.fetch).toHaveBeenCalledTimes(21));
	expect(mocks.purge).not.toHaveBeenCalled();
	slow.resolve(new Response(null, { status: 204 }));
	await result;
	expect(mocks.purge).toHaveBeenCalledOnce();
});

it("並行生成の子バッチは最後の言語でもキャッシュを消さない", async () => {
	await worker.fetch(
		new Request("https://reader.internal/__invalidate", {
			method: "POST",
			headers: {
				"X-Evame-Reader-Locale": "pi",
				"X-Evame-Reader-Batch": "true",
				"X-Evame-Reader-Defer-Purge": "true",
			},
		}),
		env,
		context,
	);
	expect(mocks.purge).not.toHaveBeenCalled();
});

it("最初の日本語バッチが完了するまでは後続言語を開始しない", async () => {
	const first = Promise.withResolvers<Response>();
	mocks.self.mockReturnValueOnce(first.promise);
	const result = worker.fetch(
		new Request("https://reader.internal/__invalidate", { method: "POST" }),
		env,
		context,
	);
	await vi.waitFor(() => expect(mocks.self).toHaveBeenCalledOnce());
	expect(
		new Headers(mocks.self.mock.calls[0][1].headers).get(
			"X-Evame-Reader-Locale",
		),
	).toBe("ja");
	first.resolve(new Response(null, { status: 204 }));
	await result;
	expect(mocks.self).toHaveBeenCalledTimes(21);
});

it("残件のある言語だけ次のバッチを続け、生成IDと保存前の版を引き継ぐ", async () => {
	let japanese = 0;
	mocks.self.mockReset().mockImplementation(async (_url, options) => {
		const locale = new Headers(options.headers).get("X-Evame-Reader-Locale");
		if (locale === "ja" && japanese++ === 0)
			return new Response(null, {
				status: 202,
				headers: { "X-Evame-Reader-Locale": "ja" },
			});
		return locale === "ja"
			? new Response(null, {
					status: 202,
					headers: { "X-Evame-Reader-Locale": "en" },
				})
			: new Response(null, { status: 204 });
	});
	await worker.fetch(
		new Request("https://reader.internal/__invalidate", {
			method: "POST",
			headers: {
				"X-Evame-Reader-Since": "5",
				"X-Evame-Reader-Publication": "save-id",
			},
		}),
		env,
		context,
	);
	expect(mocks.self).toHaveBeenCalledTimes(22);
	for (const [, options] of mocks.self.mock.calls) {
		const headers = new Headers(options.headers);
		expect(headers.get("X-Evame-Reader-Publication")).toBe("save-id");
		expect(headers.get("X-Evame-Reader-Since")).toBe("5");
	}
	expect(mocks.purge).toHaveBeenCalledOnce();
});

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
	expect(mocks.publication.mock.calls[0]?.[8]).toBe(
		env.CF_VERSION_METADATA.timestamp,
	);
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
