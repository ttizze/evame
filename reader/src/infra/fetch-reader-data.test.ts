import { getReaderData } from "virtual:evame-reader-data";
import { beforeEach, expect, it, vi } from "vitest";
import { fetchReaderData } from "./fetch-reader-data";

vi.mock("virtual:evame-reader-data", () => ({ getReaderData: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it("同じWorkerの取得処理へURL・検索条件・所有者プレビューの認証を渡す", async () => {
	vi.mocked(getReaderData).mockResolvedValue(new Response("本文"));
	const response = await fetchReaderData(
		"https://evame.test",
		"/ja/alice/post",
		"?page=2",
		"test-session",
		"test-authorization",
	);
	expect(await response.text()).toBe("本文");
	const [request] = vi.mocked(getReaderData).mock.calls[0];
	expect(new URL(request.url).searchParams.get("path")).toBe("/ja/alice/post");
	expect(new URL(request.url).searchParams.get("search")).toBe("?page=2");
	expect(request.headers.get("cookie")).toBe("test-session");
	expect(request.headers.get("authorization")).toBe("test-authorization");
});
it("未ログインの取得でもHTTP通信や別Workerを呼ばない", async () => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	try {
		vi.mocked(getReaderData).mockResolvedValue(
			new Response(null, { status: 404 }),
		);
		expect(
			(await fetchReaderData("https://preview.test", "/ja", "", null, null))
				.status,
		).toBe(404);
		expect(fetch).not.toHaveBeenCalled();
		expect(
			vi.mocked(getReaderData).mock.calls[0][0].headers.get("cookie"),
		).toBe("");
	} finally {
		vi.unstubAllGlobals();
	}
});
