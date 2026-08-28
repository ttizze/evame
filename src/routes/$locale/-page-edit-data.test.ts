import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getAllTagsWithCountMock,
	getCurrentUserFromHeadersMock,
	getPageWithTitleAndTagsBySlugMock,
	getTranslationContextsByUserIdMock,
	getUserTargetLocalesMock,
	mdastToHtmlMock,
	setResponseHeaderMock,
} = vi.hoisted(() => ({
	getAllTagsWithCountMock: vi.fn(),
	getCurrentUserFromHeadersMock: vi.fn(),
	getPageWithTitleAndTagsBySlugMock: vi.fn(),
	getTranslationContextsByUserIdMock: vi.fn(),
	getUserTargetLocalesMock: vi.fn(),
	mdastToHtmlMock: vi.fn(),
	setResponseHeaderMock: vi.fn(),
}));

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: getCurrentUserFromHeadersMock,
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: () => new Headers(),
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
vi.mock("@/app/[locale]/_domain/mdast-to-html", () => ({
	mdastToHtml: mdastToHtmlMock,
}));
vi.mock(
	"@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_db/queries.server",
	() => ({
		getAllTagsWithCount: getAllTagsWithCountMock,
		getPageWithTitleAndTagsBySlug: getPageWithTitleAndTagsBySlugMock,
		getTranslationContextsByUserId: getTranslationContextsByUserIdMock,
		getUserTargetLocales: getUserTargetLocalesMock,
	}),
);

const { getPageEditData } = await import("./-page-edit-data");

const input = {
	handle: "owner",
	locale: "en",
	pageSlug: "new-page",
};

const currentUser = {
	id: "user-id",
	handle: "owner",
};

describe("getPageEditData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getCurrentUserFromHeadersMock.mockResolvedValue(currentUser);
		getAllTagsWithCountMock.mockResolvedValue([]);
		getTranslationContextsByUserIdMock.mockResolvedValue([]);
		getUserTargetLocalesMock.mockResolvedValue([]);
		mdastToHtmlMock.mockResolvedValue({ html: "" });
	});

	it("本人が未作成のslugを開くと新規ページ用データを返す", async () => {
		getPageWithTitleAndTagsBySlugMock.mockResolvedValue(undefined);

		await expect(getPageEditData({ data: input })).resolves.toEqual({
			allTagsWithCount: [],
			currentUser,
			html: "",
			initialTitle: undefined,
			pageSlug: "new-page",
			pageWithTitleAndTags: undefined,
			targetLocales: [],
			translationContexts: [],
			userLocale: "en",
		});
	});
});
