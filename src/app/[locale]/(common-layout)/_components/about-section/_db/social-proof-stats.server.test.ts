import { beforeEach, describe, expect, it, vi } from "vitest";

const { unstableCacheMock, selectFromMock } = vi.hoisted(() => ({
	unstableCacheMock: vi.fn(),
	selectFromMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
	unstable_cache: unstableCacheMock,
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
		unstableCacheMock.mockImplementation((callback) => callback);

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

		expect(unstableCacheMock).toHaveBeenCalledWith(
			expect.any(Function),
			["top:social-proof-stats"],
			{
				revalidate: 43200,
				tags: ["top:social-proof-stats"],
			},
		);
		expect(selectFromMock).toHaveBeenCalledWith("pages");
		expect(selectFromMock).toHaveBeenCalledWith("segmentTranslations");
		expect(result).toEqual({
			articles: 10,
			translations: 200,
			languages: 18,
		});
	});
});
