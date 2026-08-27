import { beforeEach, describe, expect, it, vi } from "vitest";

const { unstableCacheMock, fetchPageDetailMock, notFoundMock } = vi.hoisted(
	() => ({
		unstableCacheMock: vi.fn(),
		fetchPageDetailMock: vi.fn(),
		notFoundMock: vi.fn(),
	}),
);

vi.mock("next/cache", () => ({
	unstable_cache: unstableCacheMock,
}));

vi.mock("next/navigation", () => ({
	notFound: notFoundMock,
}));

vi.mock("@/app/[locale]/_db/fetch-page-detail.server", () => ({
	fetchPageDetail: fetchPageDetailMock,
}));

import { fetchAboutPage } from "./fetch-about-page";

describe("fetchAboutPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchPageDetailMock.mockResolvedValue({ id: 1 });
		unstableCacheMock.mockImplementation((callback) => callback);
	});

	it("トップページのAboutデータを12時間キャッシュ付きで取得する", async () => {
		await fetchAboutPage("ja");

		expect(unstableCacheMock).toHaveBeenCalledWith(
			expect.any(Function),
			["top:about-page", "ja"],
			{
				revalidate: 43200,
				tags: ["top:about-page:ja"],
			},
		);
		expect(fetchPageDetailMock).toHaveBeenCalledWith("evame", "ja");
	});

	it("日本語以外のlocaleはevame-jaのslugを読む", async () => {
		await fetchAboutPage("en");

		expect(fetchPageDetailMock).toHaveBeenCalledWith("evame-ja", "en");
	});

	it("ページが見つからない場合はnotFoundを呼ぶ", async () => {
		const notFoundResult = Symbol("not-found");
		notFoundMock.mockReturnValue(notFoundResult);
		fetchPageDetailMock.mockResolvedValue(null);

		const result = await fetchAboutPage("ja");

		expect(notFoundMock).toHaveBeenCalled();
		expect(result).toBe(notFoundResult);
	});
});
