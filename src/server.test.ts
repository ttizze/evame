// @vitest-environment node
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
import server from "./server";

vi.mock("@sentry/cloudflare", () => ({
	withSentry: vi.fn((_options: unknown, entry: unknown) => entry),
	captureException: vi.fn(),
}));
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

const env = {
	SETTINGS: { get: vi.fn().mockResolvedValue(false) },
	READER: { fetch: vi.fn() },
};
beforeEach(() => {
	env.SETTINGS.get.mockReset().mockResolvedValue(false);
	env.READER.fetch
		.mockReset()
		.mockResolvedValue(new Response("missing", { status: 404 }));
});

it.each(["GET", "HEAD"])(
	"Astroの%sアセットをHTMLと同じReaderから配信し、DBや認証を起動しない",
	async (method) => {
		env.READER.fetch.mockResolvedValue(
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
			{ waitUntil: vi.fn() },
		);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe(method === "GET" ? "export {}" : "");
		expect(response.headers.get("Cache-Control")).toContain("immutable");
		expect(response.headers.get("Set-Cookie")).toBeNull();
		expect(env.READER.fetch).toHaveBeenCalled();
		expect(createDb).not.toHaveBeenCalled();
		expect(handler.fetch).not.toHaveBeenCalled();
	},
);

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
				{ waitUntil: vi.fn() },
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
			new Request("https://evame.test"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ waitUntil: (promise) => pending.push(promise) },
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
			new Request("https://evame.test"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ waitUntil: (promise) => pending.push(promise) },
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
			new Request("https://evame.test"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ waitUntil: vi.fn() },
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
			waitUntil: (promise: Promise<unknown>) => pending.push(promise),
		};
		const responses = await Promise.all(
			[1, 2].map(() =>
				server.fetch(
					new Request("https://evame.test"),
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
				new Request("https://evame.test"),
				env as unknown as typeof import("cloudflare:workers").env,
				{ waitUntil: vi.fn() },
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
		env.READER.fetch.mockResolvedValue(
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
			{ waitUntil: vi.fn() },
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
				{ waitUntil: vi.fn() },
			);
			expect(response.status).toBe(307);
			expect(response.headers.get("location")).toBe(
				"https://evame.test/ja/maintenance",
			);
			expect(env.READER.fetch).not.toHaveBeenCalled();
			expect(createDb).not.toHaveBeenCalled();
		},
	);
	it("Astroの404を旧記事画面へフォールバックしない", async () => {
		const response = await server.fetch(
			new Request("https://evame.test/ja/author/hidden"),
			env as unknown as typeof import("cloudflare:workers").env,
			{ waitUntil: vi.fn() },
		);
		expect(response.status).toBe(404);
		expect(handler.fetch).not.toHaveBeenCalled();
		expect(createDb).not.toHaveBeenCalled();
	});
});
describe("公開HTMLの更新", () => {
	it("更新処理はAstroのキャッシュ無効化を待ってから成功を返す", async () => {
		const purge = Promise.withResolvers<Response>();
		env.READER.fetch.mockReturnValue(purge.promise);
		vi.mocked(handler.fetch).mockResolvedValue(new Response("saved"));
		let finished = false;
		const pending: Promise<unknown>[] = [];
		const result = server
			.fetch(
				new Request("https://evame.test/_serverFn/save-page", {
					method: "POST",
				}),
				env as unknown as typeof import("cloudflare:workers").env,
				{ waitUntil: (p) => pending.push(p) },
			)
			.then((value) => {
				finished = true;
				return value;
			});
		await vi.waitFor(() => expect(env.READER.fetch).toHaveBeenCalled());
		expect(finished).toBe(false);
		purge.resolve(new Response(null, { status: 204 }));
		expect(await (await result).text()).toBe("saved");
		await Promise.all(pending);
	});
	it("下書きの保存は公開HTMLのキャッシュを破棄しない", async () => {
		vi.mocked(handler.fetch).mockResolvedValue(
			new Response(null, { headers: { "X-Evame-Reader-Changed": "false" } }),
		);
		await server.fetch(
			new Request("https://evame.test/_serverFn/save-page", { method: "POST" }),
			env as unknown as typeof import("cloudflare:workers").env,
			{ waitUntil: vi.fn() },
		);
		expect(env.READER.fetch).not.toHaveBeenCalled();
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
				{ waitUntil: vi.fn() },
			);
			expect(env.READER.fetch).not.toHaveBeenCalled();
		},
	);
	it("権限不足で拒否した更新ではキャッシュを破棄しない", async () => {
		vi.mocked(handler.fetch).mockResolvedValue(
			new Response(null, { status: 403 }),
		);
		await server.fetch(
			new Request("https://evame.test/_serverFn/save-page", { method: "POST" }),
			env as unknown as typeof import("cloudflare:workers").env,
			{ waitUntil: vi.fn() },
		);
		expect(env.READER.fetch).not.toHaveBeenCalled();
	});
	it("キャッシュ削除に失敗したら成功を返さずDB接続も閉じる", async () => {
		env.READER.fetch.mockResolvedValue(new Response(null, { status: 503 }));
		vi.mocked(handler.fetch).mockResolvedValue(new Response("saved"));
		await expect(
			server.fetch(
				new Request("https://evame.test/_serverFn/save-page", {
					method: "POST",
				}),
				env as unknown as typeof import("cloudflare:workers").env,
				{ waitUntil: vi.fn() },
			),
		).rejects.toThrow("Reader cache invalidation failed");
		expect(
			vi.mocked(createDb).mock.results[0].value.destroy,
		).toHaveBeenCalledOnce();
	});
});
