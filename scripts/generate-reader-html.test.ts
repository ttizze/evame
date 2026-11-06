// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), stop: vi.fn() }));
vi.mock("wrangler", () => ({ unstable_dev: async () => mocks }));
vi.mock("../src/app/_constants/locale.ts", () => ({
	supportedLocaleOptions: ["ja", "en", "zh", "es", "fr", "de"].map((code) => ({
		code,
	})),
}));
vi.mock("node:fs/promises", () => ({
	readFile: async () =>
		JSON.stringify({
			name: "fixture",
			account_id: "fixture",
			compatibility_date: "2026-11-06",
		}),
	mkdtemp: async () => "/tmp/reader-test",
	writeFile: async () => {},
	rm: async () => {},
}));
beforeEach(() => {
	vi.resetModules();
	mocks.fetch.mockReset();
	mocks.stop.mockReset();
});
afterEach(() => vi.useRealTimers());

it("言語を並行生成し、全言語が終わってからキャッシュを消して接続を閉じる", async () => {
	const slow = Promise.withResolvers<Response>();
	mocks.fetch.mockImplementation(async (path, options) =>
		path === "/__purge"
			? new Response(null, { status: 204 })
			: options.headers["X-Evame-Reader-Locale"] === "en"
				? slow.promise
				: Response.json({ generated: 1, remaining: 0, nextLocale: null }),
	);
	const done = import("./generate-reader-html.mjs");
	await vi.waitFor(() =>
		expect(mocks.fetch.mock.calls.length).toBeGreaterThanOrEqual(2),
	);
	expect(mocks.stop).not.toHaveBeenCalled();
	slow.resolve(Response.json({ generated: 1, remaining: 0, nextLocale: "en" }));
	await done;
	expect(mocks.fetch.mock.calls.at(-1)?.[0]).toBe("/__purge");
	expect(mocks.stop).toHaveBeenCalledOnce();
});

it("競合による一時エラーは同じ言語と生成IDで再開する", async () => {
	vi.useFakeTimers();
	mocks.fetch
		.mockResolvedValueOnce(new Response(null, { status: 500 }))
		.mockImplementation(async (path) =>
			path === "/__purge"
				? new Response(null, { status: 204 })
				: Response.json({ generated: 1, remaining: 0, nextLocale: null }),
		);
	const done = import("./generate-reader-html.mjs");
	await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
	await vi.advanceTimersByTimeAsync(2000);
	await done;
	const ja = mocks.fetch.mock.calls.filter(
		([path, options]) =>
			path === "/__publish" &&
			options.headers["X-Evame-Reader-Locale"] === "ja",
	);
	expect(ja).toHaveLength(2);
	expect(ja[1]?.[1].headers).toEqual(ja[0]?.[1].headers);
	expect(mocks.stop).toHaveBeenCalledOnce();
});

it("一言語が失敗しても他言語を待ってからキャッシュを消し、失敗を通知する", async () => {
	const slow = Promise.withResolvers<Response>();
	mocks.fetch.mockImplementation(async (path, options) =>
		path === "/__purge"
			? new Response(null, { status: 204 })
			: options.headers["X-Evame-Reader-Locale"] === "ja"
				? new Response(null, { status: 400 })
				: slow.promise,
	);
	const done = expect(import("./generate-reader-html.mjs")).rejects.toThrow(
		"HTTP 400",
	);
	await vi.waitFor(() =>
		expect(mocks.fetch.mock.calls.length).toBeGreaterThanOrEqual(2),
	);
	expect(mocks.stop).not.toHaveBeenCalled();
	slow.resolve(Response.json({ generated: 1, remaining: 0, nextLocale: null }));
	await done;
	expect(mocks.fetch.mock.calls.at(-1)?.[0]).toBe("/__purge");
	expect(mocks.stop).toHaveBeenCalledOnce();
});

it("デプロイ時も4言語を上限にし、空いた枠で残りの言語を生成する", async () => {
	const release = Promise.withResolvers<void>();
	let active = 0;
	let maximum = 0;
	mocks.fetch.mockResolvedValueOnce(
		Response.json({ generated: 1, remaining: 0, nextLocale: null }),
	);
	mocks.fetch.mockImplementation(async (path) => {
		if (path === "/__purge") return new Response(null, { status: 204 });
		maximum = Math.max(maximum, ++active);
		await release.promise;
		active--;
		return Response.json({ generated: 1, remaining: 0, nextLocale: null });
	});
	const done = import("./generate-reader-html.mjs");
	await vi.waitFor(() =>
		expect(mocks.fetch.mock.calls.length).toBeGreaterThanOrEqual(5),
	);
	const started = mocks.fetch.mock.calls.length;
	release.resolve();
	await done;
	expect(started).toBe(5);
	expect(maximum).toBe(4);
	expect(mocks.fetch).toHaveBeenCalledTimes(7);
});
