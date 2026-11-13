import { afterEach, expect, it, vi } from "vitest";
import { fetchReaderData } from "./fetch-reader-data";

const backend = vi.hoisted(() => ({
	PREVIEW_GATEWAY_ORIGIN: undefined as string | undefined,
	BACKEND: { fetch: vi.fn() },
}));
vi.mock("cloudflare:workers", () => ({ env: backend }));
afterEach(() => {
	backend.PREVIEW_GATEWAY_ORIGIN = undefined;
	vi.unstubAllGlobals();
});

it("ReaderBackendへページのURL・検索条件・所有者プレビューの認証を渡す", async () => {
	backend.BACKEND.fetch.mockResolvedValue(new Response("ページデータ"));
	const response = await fetchReaderData(
		"https://evame.test",
		"/ja/alice/post",
		"?page=2",
		"test-session",
		"test-authorization",
	);
	expect(await response.text()).toBe("ページデータ");
	const [url, init] = backend.BACKEND.fetch.mock.calls[0];
	expect(new URL(url).searchParams.get("path")).toBe("/ja/alice/post");
	expect(new URL(url).searchParams.get("search")).toBe("?page=2");
	expect(init.headers).toEqual({
		cookie: "test-session",
		authorization: "test-authorization",
	});
});

it("プレビューでは同じGatewayのAPIを呼び、本番のbindingを使わない", async () => {
	backend.PREVIEW_GATEWAY_ORIGIN = "https://preview.test";
	const fetch = vi.fn().mockResolvedValue(new Response("プレビュー"));
	vi.stubGlobal("fetch", fetch);
	const response = await fetchReaderData(
		"https://preview.test",
		"/ja",
		"",
		null,
		null,
	);
	expect(await response.text()).toBe("プレビュー");
	expect(fetch).toHaveBeenCalledOnce();
	expect(backend.BACKEND.fetch).not.toHaveBeenCalled();
	const [url, init] = fetch.mock.calls[0];
	expect(new URL(url).origin).toBe("https://preview.test");
	expect(init.headers).toEqual({ cookie: "", authorization: "" });
});
