// @vitest-environment node

import { cache } from "cloudflare:workers";
import publicPages from "virtual:evame-public-pages";
import { captureException, withSentry } from "@sentry/cloudflare";
import { redirect } from "@tanstack/react-router";
import handler from "@tanstack/react-start/server-entry";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createDb } from "./db";

const pendingInvalidations = vi.hoisted(() => new Map<string, string>());
vi.mock("./db/mutations", () => ({
	storeReaderCacheInvalidations: vi.fn(
		async (tags: string[], version: string) => {
			for (const tag of tags) pendingInvalidations.set(tag, version);
		},
	),
	deleteReaderCacheInvalidations: vi.fn(
		async (rows: { tag: string; version: string }[]) => {
			for (const row of rows)
				if (pendingInvalidations.get(row.tag) === row.version)
					pendingInvalidations.delete(row.tag);
		},
	),
}));

import { fetchReaderChanges } from "./db/queries";
import server, { PublicPages } from "./server";

vi.mock("@sentry/cloudflare", () => ({
	withSentry: vi.fn((_options: unknown, entry: unknown) => entry),
	captureException: vi.fn(),
}));
vi.mock("./app/api/reader-data/handler", () => ({
	getReaderData: vi.fn(async () => new Response("reader data")),
}));
vi.mock("virtual:evame-public-pages", () => ({ default: { fetch: vi.fn() } }));
vi.mock("@tanstack/react-start/server-entry", () => ({
	default: { fetch: vi.fn() },
}));
vi.mock("./db", async () => {
	const { AsyncLocalStorage } = await import("node:async_hooks");
	return {
		createDb: vi.fn(() => ({ destroy: vi.fn().mockResolvedValue(undefined) })),
		databaseScope: new AsyncLocalStorage(),
	};
});
vi.mock("./db/queries", () => ({
	fetchReaderRevision: vi.fn().mockResolvedValue({ revision: 1 }),
	fetchReaderChanges: vi.fn().mockResolvedValue([{ key: "page:123" }]),
	fetchReaderCacheInvalidations: vi.fn(async () =>
		[...pendingInvalidations].map(([tag, version]) => ({ tag, version })),
	),
}));

const env = {
	SETTINGS: { get: vi.fn().mockResolvedValue(false) },
	ASSETS: { fetch: vi.fn() },
};
const publicBinding = { fetch: vi.fn(), purge: vi.fn() };
const exports = { PublicPages: publicBinding };
beforeEach(() => {
	pendingInvalidations.clear();
	publicBinding.purge.mockReset().mockResolvedValue(undefined);
	vi.mocked(fetchReaderChanges).mockResolvedValue([{ key: "page:123" }]);
	env.SETTINGS.get.mockReset().mockResolvedValue(false);
	publicBinding.fetch
		.mockReset()
		.mockResolvedValue(new Response("missing", { status: 404 }));
});

it.each(["GET", "HEAD"])(
	"Astroの%sアセットをHTMLと同じWorkerから配信し、DBや認証を起動しない",
	async (method) => {
		publicBinding.fetch.mockResolvedValue(
			new Response(method === "GET" ? "export {}" : null, {
				headers: {
					"Cache-Control": "public, max-age=31536000, immutable",
					"Content-Type": "text/javascript",
				},
			}),
		);
		const response = await server.fetch(
			new Request("https://evame.test/_astro/header.hash.js", { method }),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe(method === "GET" ? "export {}" : "");
		expect(response.headers.get("Cache-Control")).toContain("immutable");
		expect(response.headers.get("Set-Cookie")).toBeNull();
		expect(publicBinding.fetch).toHaveBeenCalled();
		expect(createDb).not.toHaveBeenCalled();
		expect(handler.fetch).not.toHaveBeenCalled();
	},
);

it("トップの部分更新HTMLをReaderへ渡し、GatewayのDBや認証を起動しない", async () => {
	publicBinding.fetch.mockResolvedValue(
		new Response("<div data-home-pages>更新した一覧</div>", {
			headers: {
				"Cache-Control": "private, no-store",
				"Content-Type": "text/html",
			},
		}),
	);
	const response = await server.fetch(
		new Request("https://evame.test/api/home-feed?locale=ja"),
		env as unknown as typeof import("cloudflare:workers").env,
		{ exports, waitUntil: vi.fn() },
	);
	expect(response.status).toBe(200);
	expect(await response.text()).toContain("更新した一覧");
	expect(publicBinding.fetch.mock.calls[0][0].url).toBe(
		"https://evame.test/api/home-feed?locale=ja",
	);
	expect(createDb).not.toHaveBeenCalled();
	expect(handler.fetch).not.toHaveBeenCalled();
	expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

let beforeSend: NonNullable<
	NonNullable<ReturnType<Parameters<typeof withSentry>[0]>>["beforeSend"]
>;
beforeAll(() => {
	const options = vi.mocked(withSentry).mock.calls[0]?.[0]({});
	if (!options?.beforeSend)
		throw new Error("SentryのbeforeSendが設定されていない");
	beforeSend = options.beforeSend;
});

describe("WorkersのSentry監視", () => {
	it("正常な認証リダイレクトを通知しない", async () => {
		expect(
			await beforeSend(
				{ type: undefined },
				{ originalException: redirect({ href: "/ja" }) },
			),
		).toBeNull();
	});
	it.each([new Error("runtime error"), new Response(null, { status: 500 })])(
		"実際のエラーや500レスポンスは通知する",
		async (error) => {
			const event = { type: undefined, message: "実際のエラー" };
			expect(await beforeSend(event, { originalException: error })).toBe(event);
		},
	);
});

describe("DB移行中のリクエスト停止", () => {
	afterEach(() => vi.unstubAllEnvs());
	it("公開HTMLも移行フラグだけでDB接続前に停止する", async () => {
		vi.stubEnv("DATABASE_MIGRATION", "true");
		const response = await new PublicPages(
			{
				waitUntil: vi.fn(),
			} as unknown as import("@cloudflare/workers-types").ExecutionContext,
			env as unknown as typeof import("cloudflare:workers").env,
		).fetch(
			new Request(
				"https://backend.internal/api/reader-data?path=/ja",
			) as unknown as import("@cloudflare/workers-types").Request,
		);
		expect(response.status).toBe(503);
		expect(response.headers.get("retry-after")).toBe("60");
		expect(createDb).not.toHaveBeenCalled();
	});

	it.each([
		["GET", "/ja"],
		["GET", "/api/auth/get-session"],
		["POST", "/api/translate/chunk"],
		["POST", "/_serverFn/save-page"],
	])(
		"移行フラグが有効なら%s %sをDB接続前に503で止める",
		async (method, path) => {
			vi.stubEnv("DATABASE_MIGRATION", "true");
			const response = await server.fetch(
				new Request(`https://evame.test${path}`, { method }),
				env as unknown as typeof import("cloudflare:workers").env,
				{ exports, waitUntil: vi.fn() },
			);
			expect(response.status).toBe(503);
			expect(response.headers.get("retry-after")).toBe("60");
			expect(createDb).not.toHaveBeenCalled();
			expect(handler.fetch).not.toHaveBeenCalled();
			expect(captureException).not.toHaveBeenCalled();
		},
	);
});

describe("WorkersのDB接続の寿命", () => {
	it("読者が本文転送を中断してもDB接続を閉じ、正常な中断をSentryに通知しない", async () => {
		vi.mocked(handler.fetch).mockResolvedValue(
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(new Uint8Array([1]));
					},
				}),
			),
		);
		const pending: Promise<unknown>[] = [];
		const response = await server.fetch(
			new Request("https://evame.test/ja/auth/login"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: (promise) => pending.push(promise) },
		);
		await response.body?.cancel(
			new DOMException("client disconnected", "AbortError"),
		);
		await expect(Promise.all(pending)).resolves.toBeDefined();
		expect(
			vi.mocked(createDb).mock.results[0].value.destroy,
		).toHaveBeenCalledOnce();
		expect(captureException).not.toHaveBeenCalled();
	});
	it("本文ストリームが失敗したらDB接続を閉じ、実際のエラーをSentryに通知する", async () => {
		const error = new Error("stream failed");
		vi.mocked(handler.fetch).mockResolvedValue(
			new Response(
				new ReadableStream({
					start(controller) {
						controller.error(error);
					},
				}),
			),
		);
		const pending: Promise<unknown>[] = [];
		const response = await server.fetch(
			new Request("https://evame.test/ja/auth/login"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: (promise) => pending.push(promise) },
		);
		await expect(response.text()).rejects.toBe(error);
		await expect(Promise.all(pending)).resolves.toBeDefined();
		expect(
			vi.mocked(createDb).mock.results[0].value.destroy,
		).toHaveBeenCalledOnce();
		expect(captureException).toHaveBeenCalledWith(error);
	});
	it("認証リダイレクトにも既存のセキュリティヘッダーを付けられる", async () => {
		vi.mocked(handler.fetch).mockResolvedValue(
			Response.redirect("https://evame.test/ja", 307),
		);
		const response = await server.fetch(
			new Request("https://evame.test/ja/auth/login"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("https://evame.test/ja");
		expect(response.headers.get("x-frame-options")).toBe("DENY");
	});
	it("同時リクエストで別々のDBを作り、本文転送後に両方の接続を閉じる", async () => {
		vi.mocked(handler.fetch).mockImplementation(
			async () => new Response("saved"),
		);
		const pending: Promise<unknown>[] = [];
		const context = {
			exports,
			waitUntil: (promise: Promise<unknown>) => pending.push(promise),
		};
		const responses = await Promise.all(
			[1, 2].map(() =>
				server.fetch(
					new Request("https://evame.test/ja/auth/login"),
					env as unknown as typeof import("cloudflare:workers").env,
					context,
				),
			),
		);
		const databases = vi
			.mocked(createDb)
			.mock.results.map((result) => result.value);
		expect(databases).toHaveLength(2);
		expect(databases[0]).not.toBe(databases[1]);
		for (const database of databases)
			expect(database.destroy).not.toHaveBeenCalled();
		expect(
			await Promise.all(responses.map((response) => response.text())),
		).toEqual(["saved", "saved"]);
		await Promise.all(pending);
		for (const database of databases)
			expect(database.destroy).toHaveBeenCalledOnce();
	});
	it("ハンドラーが失敗してもDB接続を閉じる", async () => {
		const error = new Error("handler failed");
		vi.mocked(handler.fetch).mockRejectedValue(error);
		await expect(
			server.fetch(
				new Request("https://evame.test/ja/auth/login"),
				env as unknown as typeof import("cloudflare:workers").env,
				{ exports, waitUntil: vi.fn() },
			),
		).rejects.toBe(error);
		expect(
			vi.mocked(createDb).mock.results[0].value.destroy,
		).toHaveBeenCalledOnce();
	});
});

describe("Astroへの表示の転送", () => {
	it.each([
		"/ja",
		"/ja/",
		"/ja/index.html",
		"/ja.html",
		"/ja/author/article",
		"/ja/author",
		"/ja/tag/test",
	])("%sはゲートウェイでDBを開かずAstroへ渡す", async (path) => {
		publicBinding.fetch.mockResolvedValue(
			new Response("reader html", {
				headers: {
					"Cache-Control": "public, max-age=3600",
					"Cache-Tag": "evame-reader",
					"Cloudflare-CDN-Cache-Control": "public, max-age=3600",
				},
			}),
		);
		const response = await server.fetch(
			new Request("https://evame.test" + path, {
				headers: { cookie: "test-session" },
			}),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(await response.text()).toBe("reader html");
		expect(response.headers.get("x-frame-options")).toBe("DENY");
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(response.headers.get("Cache-Tag")).toBeNull();
		expect(response.headers.get("Set-Cookie")).toContain("NEXT_LOCALE=ja");
		expect(createDb).not.toHaveBeenCalled();
		expect(handler.fetch).not.toHaveBeenCalled();
	});
	it.each(["/ja", "/ja/", "/ja/index.html", "/ja.html"])(
		"メンテナンス中は%sをAstroへ渡さない",
		async (path) => {
			env.SETTINGS.get.mockResolvedValue(true);
			const response = await server.fetch(
				new Request("https://evame.test" + path),
				env as unknown as typeof import("cloudflare:workers").env,
				{ exports, waitUntil: vi.fn() },
			);
			expect(response.status).toBe(307);
			expect(response.headers.get("location")).toBe(
				"https://evame.test/ja/maintenance",
			);
			expect(publicBinding.fetch).not.toHaveBeenCalled();
			expect(createDb).not.toHaveBeenCalled();
		},
	);
	it("Astroの404を旧記事画面へフォールバックしない", async () => {
		const response = await server.fetch(
			new Request("https://evame.test/ja/author/hidden"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(response.status).toBe(404);
		expect(handler.fetch).not.toHaveBeenCalled();
		expect(createDb).not.toHaveBeenCalled();
	});
});
describe("公開HTMLの更新", () => {
	it("記事数や言語数によらず変更対象のキャッシュ削除だけを同じWorker内で一度削除する", async () => {
		publicBinding.purge.mockResolvedValue(undefined);
		vi.mocked(handler.fetch).mockResolvedValue(new Response(null));
		await server.fetch(
			new Request("https://evame.test/_serverFn/save-page", { method: "POST" }),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(publicBinding.purge).toHaveBeenCalledOnce();
		expect(publicBinding.purge).toHaveBeenCalledWith([
			expect.stringMatching(/^reader:[a-f0-9]{64}$/),
		]);
	});
	it("更新処理はAstroのキャッシュ無効化を待ってから成功を返す", async () => {
		const purge = Promise.withResolvers<void>();
		publicBinding.purge.mockReturnValue(purge.promise);
		vi.mocked(handler.fetch).mockResolvedValue(new Response("saved"));
		let finished = false;
		const pending: Promise<unknown>[] = [];
		const result = server
			.fetch(
				new Request("https://evame.test/_serverFn/save-page", {
					method: "POST",
				}),
				env as unknown as typeof import("cloudflare:workers").env,
				{ exports, waitUntil: (p) => pending.push(p) },
			)
			.then((value) => {
				finished = true;
				return value;
			});
		await vi.waitFor(() => expect(publicBinding.purge).toHaveBeenCalled());
		expect(finished).toBe(false);
		purge.resolve();
		expect(await (await result).text()).toBe("saved");
		await Promise.all(pending);
	});
	it("下書きの保存は公開HTMLのキャッシュを破棄しない", async () => {
		pendingInvalidations.set(`reader:${"a".repeat(64)}`, "previous-failure");
		vi.mocked(handler.fetch).mockResolvedValue(
			new Response(null, { headers: { "X-Evame-Reader-Changed": "false" } }),
		);
		await server.fetch(
			new Request("https://evame.test/_serverFn/save-page", { method: "POST" }),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(publicBinding.purge).not.toHaveBeenCalled();
	});
	it.each(["like", "geminiKey", "uploadImage"])(
		"%sの操作は本文のキャッシュを破棄しない",
		async (action) => {
			vi.mocked(handler.fetch).mockResolvedValue(new Response(null));
			await server.fetch(
				new Request("https://evame.test/api/reader-actions?action=" + action, {
					method: "POST",
				}),
				env as unknown as typeof import("cloudflare:workers").env,
				{ exports, waitUntil: vi.fn() },
			);
			expect(publicBinding.purge).not.toHaveBeenCalled();
		},
	);
	it("権限不足で拒否した更新ではキャッシュを破棄しない", async () => {
		vi.mocked(handler.fetch).mockResolvedValue(
			new Response(null, { status: 403 }),
		);
		await server.fetch(
			new Request("https://evame.test/_serverFn/save-page", { method: "POST" }),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(publicBinding.purge).not.toHaveBeenCalled();
	});
	it("キャッシュ削除に失敗したら成功を返さずDB接続も閉じる", async () => {
		publicBinding.purge.mockRejectedValue(
			new Error("Public HTML cache invalidation failed"),
		);
		vi.mocked(handler.fetch).mockResolvedValue(new Response("saved"));
		await expect(
			server.fetch(
				new Request("https://evame.test/_serverFn/save-page", {
					method: "POST",
				}),
				env as unknown as typeof import("cloudflare:workers").env,
				{ exports, waitUntil: vi.fn() },
			),
		).rejects.toThrow("Public HTML cache invalidation failed");
		expect(
			vi.mocked(createDb).mock.results[0].value.destroy,
		).toHaveBeenCalledOnce();
	});
});

it("公開データに変更がない保存ではキャッシュを削除しない", async () => {
	vi.mocked(fetchReaderChanges).mockResolvedValue([]);
	vi.mocked(handler.fetch).mockResolvedValue(new Response(null));
	await server.fetch(
		new Request("https://evame.test/_serverFn/save-page", { method: "POST" }),
		env as unknown as typeof import("cloudflare:workers").env,
		{ exports, waitUntil: vi.fn() },
	);
	expect(publicBinding.purge).not.toHaveBeenCalled();
});

it("キャッシュ削除に失敗した後は差分がない再試行でも保留タグを削除してから成功を返す", async () => {
	vi.mocked(handler.fetch).mockResolvedValue(new Response(null));
	publicBinding.purge.mockRejectedValue(
		new Error("Public HTML cache invalidation failed"),
	);
	const request = () =>
		new Request("https://evame.test/api/reader-actions?action=pageComments", {
			method: "POST",
		});
	await expect(
		server.fetch(
			request(),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		),
	).rejects.toThrow("Public HTML cache invalidation failed");
	expect(pendingInvalidations.size).toBe(1);
	vi.mocked(fetchReaderChanges).mockResolvedValue([]);
	vi.mocked(handler.fetch).mockResolvedValue(new Response(null));
	publicBinding.purge.mockResolvedValue(undefined);
	expect(
		(
			await server.fetch(
				request(),
				env as unknown as typeof import("cloudflare:workers").env,
				{ exports, waitUntil: vi.fn() },
			)
		).status,
	).toBe(200);
	expect(publicBinding.purge).toHaveBeenCalledTimes(2);
	expect(pendingInvalidations.size).toBe(0);
});
it("翻訳チャンクが完了した場合も処理前の版から変更を取得しキャッシュを削除する", async () => {
	vi.mocked(handler.fetch).mockResolvedValue(
		new Response(null, { headers: { "X-Evame-Reader-Changed": "true" } }),
	);
	publicBinding.purge.mockResolvedValue(undefined);
	await server.fetch(
		new Request("https://evame.test/api/translate/chunk", { method: "POST" }),
		env as unknown as typeof import("cloudflare:workers").env,
		{ exports, waitUntil: vi.fn() },
	);
	expect(publicBinding.purge).toHaveBeenCalledOnce();
});

it.each([
	["GET", "NEXT_LOCALE=ja", "en", "/ja?view=source"],
	["HEAD", "NEXT_LOCALE=es", "ja", "/es?view=source"],
	["GET", "", "ja,en;q=0.8", "/ja?view=source"],
])(
	"入口の%sは言語と検索条件を維持し、DBとTanStackを起動せず移動する",
	async (method, cookie, language, location) => {
		const response = await server.fetch(
			new Request("https://evame.test/?view=source", {
				method,
				headers: { cookie, "accept-language": language },
			}),
			env as unknown as typeof import("cloudflare:workers").env,
			{ exports, waitUntil: vi.fn() },
		);
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe(location);
		expect(createDb).not.toHaveBeenCalled();
		expect(handler.fetch).not.toHaveBeenCalled();
		expect(response.headers.get("cache-control")).toBe("private, no-store");
	},
);

it("入口の古い言語Cookieを更新し、保存言語をほかの利用者へ共有しない", async () => {
	const response = await server.fetch(
		new Request("https://evame.test/", {
			headers: { cookie: "NEXT_LOCALE=obsolete", "accept-language": "ja" },
		}),
		env as unknown as typeof import("cloudflare:workers").env,
		{ exports, waitUntil: vi.fn() },
	);
	expect(response.headers.get("location")).toBe("/ja");
	expect(response.headers.get("set-cookie")).toContain("NEXT_LOCALE=ja");
	expect(response.headers.get("cache-control")).toBe("private, no-store");
	expect(response.headers.get("x-frame-options")).toBe("DENY");
});
it("入口でもメンテナンス中は既存のメンテナンス画面へ移動する", async () => {
	env.SETTINGS.get.mockResolvedValue(true);
	const response = await server.fetch(
		new Request("https://evame.test/", {
			headers: { cookie: "NEXT_LOCALE=ja" },
		}),
		env as unknown as typeof import("cloudflare:workers").env,
		{ exports, waitUntil: vi.fn() },
	);
	expect(response.headers.get("location")).toBe(
		"https://evame.test/ja/maintenance",
	);
	expect(createDb).not.toHaveBeenCalled();
});

describe("同じWorkerの公開HTMLとキャッシュ削除", () => {
	afterEach(() => {
		Reflect.deleteProperty(cache, "purge");
	});
	it("Astroは同じリクエストのDBを使い、本文を転送してから接続を閉じる", async () => {
		vi.mocked(publicPages.fetch).mockResolvedValue(new Response("Astro本文"));
		const pending: Promise<unknown>[] = [];
		const context = {
			waitUntil: (promise: Promise<unknown>) => pending.push(promise),
		};
		const entry = new PublicPages(
			context as unknown as import("@cloudflare/workers-types").ExecutionContext,
			env as unknown as typeof import("cloudflare:workers").env,
		);
		const response = await entry.fetch(
			new Request(
				"https://evame.test/ja/author/post",
			) as unknown as import("@cloudflare/workers-types").Request,
		);
		const database = vi.mocked(createDb).mock.results[0].value;
		expect(database.destroy).not.toHaveBeenCalled();
		expect(await response.text()).toBe("Astro本文");
		await Promise.all(pending);
		expect(database.destroy).toHaveBeenCalledOnce();
		expect(handler.fetch).not.toHaveBeenCalled();
	});
	it("ハッシュ付きアセットをDB接続なしで同じWorkerのASSETSから返す", async () => {
		env.ASSETS.fetch.mockResolvedValue(new Response("export {}"));
		const entry = new PublicPages(
			{} as import("@cloudflare/workers-types").ExecutionContext,
			env as unknown as typeof import("cloudflare:workers").env,
		);
		expect(
			await (
				await entry.fetch(
					new Request(
						"https://evame.test/_astro/client.js",
					) as unknown as import("@cloudflare/workers-types").Request,
				)
			).text(),
		).toBe("export {}");
		expect(createDb).not.toHaveBeenCalled();
	});
	it("公開入口のキャッシュを100タグずつ削除し、失敗を呼出元へ返す", async () => {
		cache.purge = vi
			.fn()
			.mockResolvedValueOnce({ success: true })
			.mockResolvedValueOnce({ success: false });
		const tags = Array.from({ length: 101 }, (_, i) => `tag-${i}`);
		await expect(PublicPages.prototype.purge(tags)).rejects.toThrow(
			"Public HTML cache invalidation failed",
		);
		expect(cache.purge).toHaveBeenNthCalledWith(1, {
			tags: tags.slice(0, 100),
		});
		expect(cache.purge).toHaveBeenNthCalledWith(2, { tags: tags.slice(100) });
	});
	it("デプロイ後の全体削除も公開入口自身で実行する", async () => {
		cache.purge = vi.fn().mockResolvedValue({ success: true });
		await PublicPages.prototype.clearCache();
		expect(cache.purge).toHaveBeenCalledWith({ purgeEverything: true });
	});
	it("cache.purge未対応のローカルではキャッシュ削除を呼び出さない", async () => {
		Reflect.deleteProperty(cache, "purge");
		await expect(
			PublicPages.prototype.purge(["reader:test"]),
		).resolves.toBeUndefined();
	});
});
