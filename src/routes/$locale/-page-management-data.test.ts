import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getCurrentUserFromHeadersMock,
	getRequestHeadersMock,
	setResponseHeaderMock,
} = vi.hoisted(() => ({
	getCurrentUserFromHeadersMock: vi.fn(),
	getRequestHeadersMock: vi.fn(() => new Headers()),
	setResponseHeaderMock: vi.fn(),
}));

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: getCurrentUserFromHeadersMock,
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: getRequestHeadersMock,
	setResponseHeader: setResponseHeaderMock,
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
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/page-management/_db/queries.server",
	() => ({
		fetchPaginatedOwnPages: vi.fn().mockResolvedValue({
			pagesWithTitle: [],
			totalPages: 0,
			currentPage: 1,
		}),
		fetchPageViewCounts: vi.fn().mockResolvedValue({}),
	}),
);

const { getPageManagementData } = await import("./-page-management-data");

const input = {
	handle: "owner",
	locale: "en",
	page: 1,
	query: "",
};

describe("getPageManagementData", () => {
	beforeEach(() => {
		getCurrentUserFromHeadersMock.mockReset();
		setResponseHeaderMock.mockReset();
	});

	it("未認証ユーザーをロケール付きログインページへリダイレクトする", async () => {
		getCurrentUserFromHeadersMock.mockResolvedValue(null);

		await expect(getPageManagementData({ data: input })).rejects.toMatchObject({
			options: { href: "/en/auth/login" },
		});
	});

	it("URLのhandleが現在ユーザーと異なる場合はデータを返さない", async () => {
		getCurrentUserFromHeadersMock.mockResolvedValue({
			id: "user-id",
			handle: "another-user",
		});

		await expect(getPageManagementData({ data: input })).resolves.toBeNull();
	});

	it("所有者には管理対象ページのデータを返す", async () => {
		getCurrentUserFromHeadersMock.mockResolvedValue({
			id: "user-id",
			handle: "owner",
		});

		await expect(getPageManagementData({ data: input })).resolves.toEqual({
			pagesWithTitle: [],
			totalPages: 0,
			currentPage: 1,
			pageViewCounts: {},
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
});
