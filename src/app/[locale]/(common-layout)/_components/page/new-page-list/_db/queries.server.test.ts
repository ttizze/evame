import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchPaginatedNewPageListsMock, unstableCacheMock } = vi.hoisted(
	() => ({
		fetchPaginatedNewPageListsMock: vi.fn(),
		unstableCacheMock: vi.fn(),
	}),
);

vi.mock("@/app/[locale]/_db/page-list.server", () => ({
	fetchPaginatedNewPageLists: fetchPaginatedNewPageListsMock,
}));

vi.mock("next/cache", () => ({
	unstable_cache: unstableCacheMock,
}));

import { fetchPaginatedNewPageListsForTopPage } from "./queries.server";

describe("fetchPaginatedNewPageListsForTopPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchPaginatedNewPageListsMock.mockResolvedValue({
			pageForLists: [],
			totalPages: 0,
		});
		unstableCacheMock.mockImplementation((callback) => callback);
	});

	it("トップページ向け新着一覧は12時間キャッシュ付きで取得する", async () => {
		await fetchPaginatedNewPageListsForTopPage({
			locale: "en",
			page: 1,
			pageSize: 5,
		});

		expect(unstableCacheMock).toHaveBeenCalledWith(
			expect.any(Function),
			["top:new-page-list", "en", "1", "5"],
			{
				revalidate: 43200,
				tags: ["top:new-page-list:en:1:5"],
			},
		);
		expect(fetchPaginatedNewPageListsMock).toHaveBeenCalledWith({
			locale: "en",
			page: 1,
			pageSize: 5,
		});
	});
});
