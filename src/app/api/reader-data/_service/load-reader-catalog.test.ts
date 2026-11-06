import { afterEach, beforeEach, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({
	fetchReaderRevision: vi.fn(),
	fetchReaderCatalogSources: vi.fn(),
}));
vi.mock("../_db/queries", () => ({
	fetchReaderCatalogSources: queries.fetchReaderCatalogSources,
}));
vi.mock("@/db/queries", () => ({
	fetchReaderRevision: queries.fetchReaderRevision,
}));
vi.mock("../_domain/reader-documents", () => ({
	buildReaderDocuments: (_source: unknown, locale: string) => ({
		[`/${locale}`]: "fixture",
	}),
}));
beforeEach(() => {
	vi.resetModules();
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-11-07T00:00:00Z"));
	queries.fetchReaderRevision.mockReset().mockResolvedValue({ revision: 1 });
	queries.fetchReaderCatalogSources
		.mockReset()
		.mockResolvedValue({ revision: 1 });
});
afterEach(() => vi.useRealTimers());

it("同じ公開内容のバッチでは全体集計を繰り返さず、要求された言語のURLだけを返す", async () => {
	const { loadReaderCatalog } = await import("./load-reader-catalog");
	expect((await loadReaderCatalog("ja")).documents).toEqual({
		"/ja": "fixture",
	});
	expect((await loadReaderCatalog("en")).documents).toEqual({
		"/en": "fixture",
	});
	expect(queries.fetchReaderCatalogSources).toHaveBeenCalledOnce();
	expect(queries.fetchReaderRevision).toHaveBeenCalledTimes(2);
});

it("公開内容が変わったら時刻を待たずに最新の生成元へ切り替える", async () => {
	const { loadReaderCatalog } = await import("./load-reader-catalog");
	await loadReaderCatalog("ja");
	queries.fetchReaderRevision.mockResolvedValue({ revision: 2 });
	queries.fetchReaderCatalogSources.mockResolvedValue({ revision: 2 });
	expect((await loadReaderCatalog("ja")).revision).toBe(2);
	expect(queries.fetchReaderCatalogSources).toHaveBeenCalledTimes(2);
});

it("公開内容に変更がなくても1時間ごとに閲覧数と人気順を集計し直す", async () => {
	const { loadReaderCatalog } = await import("./load-reader-catalog");
	await loadReaderCatalog("ja");
	vi.setSystemTime(new Date("2026-11-07T01:00:00Z"));
	await loadReaderCatalog("ja");
	expect(queries.fetchReaderCatalogSources).toHaveBeenCalledTimes(2);
});
