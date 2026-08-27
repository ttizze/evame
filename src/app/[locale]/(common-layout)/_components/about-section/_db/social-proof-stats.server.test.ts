import { beforeEach, describe, expect, it, vi } from "vitest";

const { cacheLifeMock, cacheTagMock, selectFromMock } = vi.hoisted(() => ({
	cacheLifeMock: vi.fn(),
	cacheTagMock: vi.fn(),
	selectFromMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheLife: cacheLifeMock,
	cacheTag: cacheTagMock,
}));

vi.mock("@/db", () => ({
	db: {
		selectFrom: selectFromMock,
	},
}));

import { fetchSocialProofStats } from "./social-proof-stats.server";

describe("fetchSocialProofStats", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		selectFromMock.mockImplementation((table: string) => {
			const query = {
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				executeTakeFirst: vi
					.fn()
					.mockResolvedValue(
						table === "pages" ? { count: 10 } : { count: 200 },
					),
			};
			return query;
		});
	});

	it("ソーシャルプルーフ統計を12時間キャッシュ付きで取得する", async () => {
		const result = await fetchSocialProofStats();

		expect(cacheLifeMock).toHaveBeenCalledWith({ expire: 43200 });
		expect(cacheTagMock).toHaveBeenCalledWith("top:social-proof-stats");
		expect(selectFromMock).toHaveBeenCalledWith("pages");
		expect(selectFromMock).toHaveBeenCalledWith("segmentTranslations");
		expect(result).toEqual({
			articles: 10,
			translations: 200,
			languages: 18,
		});
	});
});
