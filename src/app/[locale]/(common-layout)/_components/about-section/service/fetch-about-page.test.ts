import { beforeEach, describe, expect, it, vi } from "vitest";

const { cacheLifeMock, cacheTagMock, fetchPageDetailMock, notFoundMock } =
	vi.hoisted(() => ({
		cacheLifeMock: vi.fn(),
		cacheTagMock: vi.fn(),
		fetchPageDetailMock: vi.fn(),
		notFoundMock: vi.fn(),
	}));

vi.mock("next/cache", () => ({
	cacheLife: cacheLifeMock,
	cacheTag: cacheTagMock,
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
	});

	it("トップページのAboutデータを12時間キャッシュ付きで取得する", async () => {
		await fetchAboutPage("ja");

		expect(cacheLifeMock).toHaveBeenCalledWith({ expire: 43200 });
		expect(cacheTagMock).toHaveBeenCalledWith("top:about-page:ja");
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
