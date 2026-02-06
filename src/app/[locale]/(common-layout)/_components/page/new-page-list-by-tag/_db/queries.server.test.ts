import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheLifeMock = vi.fn();
const cacheTagMock = vi.fn();
const buildPageListQueryMock = vi.fn();
const fetchTagsMapMock = vi.fn();
const toPageForListMock = vi.fn();
const selectFromMock = vi.fn();

vi.mock("next/cache", () => ({
	cacheLife: cacheLifeMock,
	cacheTag: cacheTagMock,
}));

vi.mock("@/app/[locale]/_db/page-list.server", () => ({
	buildPageListQuery: buildPageListQueryMock,
	fetchTagsMap: fetchTagsMapMock,
	toPageForList: toPageForListMock,
}));

vi.mock("@/db", () => ({
	db: {
		selectFrom: selectFromMock,
	},
}));

import {
	fetchPaginatedPublicNewestPageListsByTag,
	fetchPaginatedPublicNewestPageListsByTagForTopPage,
	fetchPublicNewestPageListsByTagsForTopPage,
} from "./queries.server";

describe("new-page-list-by-tag queries", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		const baseQuery = {
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			offset: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([{ id: 10 }]),
			as: vi.fn().mockImplementation((name: string) => ({ name })),
		};
		buildPageListQueryMock.mockReturnValue(baseQuery);

		const countQuery = {
			innerJoin: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			executeTakeFirst: vi.fn().mockResolvedValue({ count: 1 }),
		};

		const rankedOuterQuery = {
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			execute: vi
				.fn()
				.mockResolvedValue([{ id: 11, tagName: "AI", rowNumber: 1 }]),
		};

		selectFromMock.mockImplementation((from: unknown) => {
			if (from === "tagPages") {
				return countQuery;
			}
			return rankedOuterQuery;
		});

		fetchTagsMapMock.mockResolvedValue(new Map([[10, []], [11, []]]));
		toPageForListMock.mockImplementation((row: { id: number }) => ({
			id: row.id,
		}));
	});

	it("通常のタグ別一覧はキャッシュせずに取得する", async () => {
		await fetchPaginatedPublicNewestPageListsByTag({
			tagName: "AI",
			page: 2,
			pageSize: 5,
			locale: "ja",
		});

		expect(cacheLifeMock).not.toHaveBeenCalled();
		expect(cacheTagMock).not.toHaveBeenCalled();
	});

	it("トップページ向けタグ別一覧は12時間キャッシュ付きで取得する", async () => {
		await fetchPaginatedPublicNewestPageListsByTagForTopPage({
			tagName: "AI",
			page: 2,
			pageSize: 5,
			locale: "ja",
		});

		expect(cacheLifeMock).toHaveBeenCalledWith({ expire: 43200 });
		expect(cacheTagMock).toHaveBeenCalledWith(
			"top:new-page-list-by-tag:ja:AI:2:5",
		);
	});

	it("トップページ向け複数タグ一覧は12時間キャッシュ付きで取得する", async () => {
		await fetchPublicNewestPageListsByTagsForTopPage({
			tagNames: ["AI", "Programming"],
			pageSize: 5,
			locale: "ja",
		});

		expect(cacheLifeMock).toHaveBeenCalledWith({ expire: 43200 });
		expect(cacheTagMock).toHaveBeenCalledWith(
			"top:new-page-lists-by-tags:ja:5:AI|Programming",
		);
	});
});
