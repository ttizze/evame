import { beforeEach, expect, it, vi } from "vitest";
import gateway from "./worker";

const env = {
	SETTINGS: { get: vi.fn() },
	READER: { fetch: vi.fn() },
	APP: { fetch: vi.fn() },
	MONITORING: { report: vi.fn() },
};
const binding = env as unknown as typeof import("cloudflare:workers").env;
beforeEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	env.SETTINGS.get.mockReset().mockResolvedValue(false);
	env.READER.fetch
		.mockReset()
		.mockImplementation(async () => new Response("本文"));
	env.APP.fetch
		.mockReset()
		.mockImplementation(async () => new Response("管理画面"));
	env.MONITORING.report.mockReset().mockResolvedValue(undefined);
});

it.each([
	"/ja",
	"/ja/author/article",
	"/ja/author",
	"/ja/tag/test",
	"/_astro/style.css",
	"/api/home-feed?locale=ja",
])("%sは編集アプリを呼ばずReaderから配信する", async (path) => {
	const response = await gateway.fetch(
		new Request(`https://evame.test${path}`),
		binding,
		{ waitUntil: vi.fn() },
	);
	expect(await response.text()).toBe("本文");
	expect(env.READER.fetch).toHaveBeenCalledOnce();
	expect(env.APP.fetch).not.toHaveBeenCalled();
});
it("ルートの言語リダイレクトはどちらのアプリも呼ばない", async () => {
	const response = await gateway.fetch(
		new Request("https://evame.test/?source=test", {
			headers: { "accept-language": "ja" },
		}),
		binding,
		{ waitUntil: vi.fn() },
	);
	expect(response.status).toBe(307);
	expect(response.headers.get("location")).toBe("/ja?source=test");
	expect(env.READER.fetch).not.toHaveBeenCalled();
	expect(env.APP.fetch).not.toHaveBeenCalled();
});
it("保存の本文・認証・Originを編集アプリへ渡し、Cookieとリダイレクトを保つ", async () => {
	env.APP.fetch.mockImplementation(async (request) => {
		expect(request.url).toBe("https://evame.test/_serverFn/save?action=save");
		expect(request.method).toBe("POST");
		expect(await request.text()).toBe("保存する本文");
		expect(request.headers.get("cookie")).toBe("session=test");
		expect(request.headers.get("origin")).toBe("https://evame.test");
		return new Response(null, {
			status: 307,
			headers: {
				location: "/ja/author/article",
				"set-cookie": "session=updated; HttpOnly",
			},
		});
	});
	const response = await gateway.fetch(
		new Request("https://evame.test/_serverFn/save?action=save", {
			method: "POST",
			headers: { cookie: "session=test", origin: "https://evame.test" },
			body: "保存する本文",
		}),
		binding,
		{ waitUntil: vi.fn() },
	);
	expect(response.status).toBe(307);
	expect(response.headers.get("set-cookie")).toBe("session=updated; HttpOnly");
	expect(response.headers.get("location")).toBe("/ja/author/article");
	expect(response.headers.get("x-frame-options")).toBe("DENY");
});
it("プレビューの保存は同じPRのアプリへ送信し、本番bindingを呼ばない", async () => {
	const mockedFetch = vi.fn(async (request: Request) => {
		expect(request.url).toBe("https://app-preview.test/api/auth/sign-in/email");
		expect(request.headers.get("host")).toBeNull();
		expect(request.headers.get("x-evame-preview-reader")).toBe(
			"preview-secret",
		);
		expect(request.headers.get("origin")).toBe("https://preview.test");
		expect(await request.text()).toBe("payload");
		expect(request.redirect).toBe("manual");
		return new Response("ok");
	});
	vi.stubGlobal("fetch", mockedFetch);
	await gateway.fetch(
		new Request("https://preview.test/api/auth/sign-in/email", {
			method: "POST",
			body: "payload",
			headers: { origin: "https://preview.test", host: "preview.test" },
		}),
		{
			...binding,
			PREVIEW_APP_ORIGIN: "https://app-preview.test",
			PREVIEW_READER_SECRET: "preview-secret",
		},
		{ waitUntil: vi.fn() },
	);
	expect(mockedFetch).toHaveBeenCalledOnce();
	expect(env.APP.fetch).not.toHaveBeenCalled();
});
it("Readerの失敗を監視へ送り、URLの認証パラメーターを含めず元のエラーを維持する", async () => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	const error = new Error("reader failed");
	env.READER.fetch.mockRejectedValue(error);
	const pending: Promise<unknown>[] = [];
	await expect(
		gateway.fetch(
			new Request("https://evame.test/ja?token=should-not-log"),
			binding,
			{
				waitUntil: (promise) => pending.push(promise),
			},
		),
	).rejects.toBe(error);
	await Promise.all(pending);
	expect(env.MONITORING.report).toHaveBeenCalledWith(
		error,
		"https://evame.test/ja",
		"GET",
	);
	expect(env.APP.fetch).not.toHaveBeenCalled();
});
it("プレビューのエラーを本番監視へ送信しない", async () => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	await expect(
		gateway.fetch(
			new Request("https://preview.test/api/auth/get-session"),
			{ ...binding, PREVIEW_APP_ORIGIN: "https://app-preview.test" },
			{ waitUntil: vi.fn() },
		),
	).rejects.toThrow("Preview secret is required");
	expect(env.APP.fetch).not.toHaveBeenCalled();
	expect(env.MONITORING.report).not.toHaveBeenCalled();
});

it.each(["/ja", "/api/auth/get-session"])(
	"DB移行中の%sはReaderと編集アプリの呼び出し前に503で止める",
	async (path) => {
		const response = await gateway.fetch(
			new Request(`https://evame.test${path}`),
			{ ...binding, DATABASE_MIGRATION: "true" },
			{ waitUntil: vi.fn() },
		);
		expect(response.status).toBe(503);
		expect(response.headers.get("retry-after")).toBe("60");
		expect(env.READER.fetch).not.toHaveBeenCalled();
		expect(env.APP.fetch).not.toHaveBeenCalled();
	},
);
