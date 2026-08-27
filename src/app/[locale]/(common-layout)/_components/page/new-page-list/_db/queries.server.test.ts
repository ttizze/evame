import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPaginatedNewPageListsMock, cacheLifeMock, cacheTagMock } =
	vi.hoisted(() => ({
		fetchPaginatedNewPageListsMock: vi.fn(),
		cacheLifeMock: vi.fn(),
		cacheTagMock: vi.fn(),
	}));

vi.mock("@/app/[locale]/_db/page-list.server", () => ({
	fetchPaginatedNewPageLists: fetchPaginatedNewPageListsMock,
}));

vi.mock("next/cache", () => ({
	cacheLife: cacheLifeMock,
	cacheTag: cacheTagMock,
}));

import { fetchPaginatedNewPageListsForTopPage } from "./queries.server";

describe("fetchPaginatedNewPageListsForTopPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchPaginatedNewPageListsMock.mockResolvedValue({
			pageForLists: [],
			totalPages: 0,
		});
	});

	it("トップページ向け新着一覧は12時間キャッシュ付きで取得する", async () => {
		await fetchPaginatedNewPageListsForTopPage({
			locale: "en",
			page: 1,
			pageSize: 5,
		});

		expect(cacheLifeMock).toHaveBeenCalledWith({ expire: 43200 });
		expect(cacheTagMock).toHaveBeenCalledWith("top:new-page-list:en:1:5");
		expect(fetchPaginatedNewPageListsMock).toHaveBeenCalledWith({
			locale: "en",
			page: 1,
			pageSize: 5,
		});
	});
});
