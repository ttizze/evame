import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { querySocialProofStats } from "../_db/queries";
import { loadSocialProofStats } from "./load-social-proof-stats";

vi.mock("../_db/queries", () => ({ querySocialProofStats: vi.fn() }));
const stats = { articles: 7, translations: 21, languages: 18 };
const match = vi.fn();
const put = vi.fn();
beforeEach(() => {
	vi.mocked(querySocialProofStats).mockReset().mockResolvedValue(stats);
	match.mockReset().mockResolvedValue(undefined);
	put.mockReset().mockResolvedValue(undefined);
	vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue({ match, put }) });
});
afterEach(() => vi.unstubAllGlobals());

it("初回は公開件数を取得して30秒キャッシュする", async () => {
	expect(await loadSocialProofStats()).toEqual(stats);
	expect(querySocialProofStats).toHaveBeenCalledOnce();
	const [key, response] = put.mock.calls[0];
	expect(key.url).toBe("https://evame.tech/_cache/social-proof-stats/v1");
	expect(response.headers.get("cache-control")).toBe("public, max-age=30");
	expect(await response.json()).toEqual(stats);
});

it("キャッシュがあればDBへ問い合わせない", async () => {
	match.mockResolvedValue(Response.json(stats));
	expect(await loadSocialProofStats()).toEqual(stats);
	expect(querySocialProofStats).not.toHaveBeenCalled();
	expect(put).not.toHaveBeenCalled();
});

it("Cache APIがない環境でもDBの件数を表示する", async () => {
	vi.stubGlobal("caches", undefined);
	expect(await loadSocialProofStats()).toEqual(stats);
});

it("キャッシュを開けなくてもDBの件数を表示する", async () => {
	vi.mocked(caches.open).mockRejectedValue(new Error("Cache unavailable"));
	expect(await loadSocialProofStats()).toEqual(stats);
});

it("期限が切れてキャッシュがなければ最新件数を取得する", async () => {
	match
		.mockResolvedValueOnce(Response.json(stats))
		.mockResolvedValueOnce(undefined);
	await loadSocialProofStats();
	vi.mocked(querySocialProofStats).mockResolvedValue({ ...stats, articles: 8 });
	expect(await loadSocialProofStats()).toEqual({ ...stats, articles: 8 });
	expect(querySocialProofStats).toHaveBeenCalledOnce();
});

it.each(["read", "write", "invalid"])(
	"キャッシュの%s障害でもDBの件数を表示する",
	async (failure) => {
		if (failure === "read")
			match.mockRejectedValue(new Error("Cache unavailable"));
		if (failure === "write")
			put.mockRejectedValue(new Error("Cache unavailable"));
		if (failure === "invalid")
			match.mockResolvedValue(new Response("invalid json"));
		expect(await loadSocialProofStats()).toEqual(stats);
	},
);
