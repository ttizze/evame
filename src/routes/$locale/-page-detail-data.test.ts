import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getCurrentUserFromHeadersMock,
	loadPageContentDataMock,
	queryPageDetailMock,
	setResponseHeaderMock,
} = vi.hoisted(() => ({
	getCurrentUserFromHeadersMock: vi.fn(),
	loadPageContentDataMock: vi.fn(),
	queryPageDetailMock: vi.fn(),
	setResponseHeaderMock: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: <T>(handler: T) => handler,
		};
		return builder;
	},
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: () => new Headers(),
	setResponseHeader: setResponseHeaderMock,
}));
vi.mock("@/app/[locale]/_db/queries", () => ({
	queryPageDetail: queryPageDetailMock,
}));
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: getCurrentUserFromHeadersMock,
}));
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data",
	() => ({ loadPageContentData: loadPageContentDataMock }),
);

const { getPageDetailData } = await import("./-page-detail-data");

const input = { locale: "en", handle: "owner", pageSlug: "draft" };

describe("getPageDetailData", () => {
	beforeEach(() => {
		queryPageDetailMock.mockReset().mockResolvedValue({
			status: "DRAFT",
			userHandle: "owner",
			segments: [{ number: 0 }],
		});
		getCurrentUserFromHeadersMock
			.mockReset()
			.mockResolvedValue({ handle: "owner" });
		loadPageContentDataMock.mockReset().mockResolvedValue({ pageDetail: {} });
		setResponseHeaderMock.mockReset();
	});

	it("所有者だけが読めるdraft responseを共有cacheへ保存させない", async () => {
		await expect(getPageDetailData({ data: input })).resolves.toEqual({
			pageDetail: {},
		});
		expect(setResponseHeaderMock).toHaveBeenCalledWith(
			"Cache-Control",
			"private, no-store",
		);
		expect(setResponseHeaderMock).toHaveBeenCalledWith(
			"Vary",
			"Cookie, Authorization",
		);
	});

	it("公開日時があるTipiṭakaのARCHIVEページはログインなしで表示する", async () => {
		queryPageDetailMock.mockResolvedValue({
			isPublishedTipitakaArchive: true,
			status: "ARCHIVE",
			userHandle: "evame",
			segments: [{ number: 0 }],
		});
		loadPageContentDataMock.mockResolvedValue({ pageDetail: { id: 1 } });

		await expect(
			getPageDetailData({
				data: { locale: "ja", handle: "evame", pageSlug: "vinaya-pitaka" },
			}),
		).resolves.toEqual({ pageDetail: { id: 1 } });
		expect(getCurrentUserFromHeadersMock).not.toHaveBeenCalled();
	});
});
