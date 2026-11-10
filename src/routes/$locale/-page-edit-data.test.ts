import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getAllTagsWithCountMock,
	getCurrentUserFromHeadersMock,
	getPageWithTitleAndTagsBySlugMock,
	getTranslationContextsByUserIdMock,
	getUserTargetLocalesMock,
	setResponseHeaderMock,
} = vi.hoisted(() => ({
	getAllTagsWithCountMock: vi.fn(),
	getCurrentUserFromHeadersMock: vi.fn(),
	getPageWithTitleAndTagsBySlugMock: vi.fn(),
	getTranslationContextsByUserIdMock: vi.fn(),
	getUserTargetLocalesMock: vi.fn(),
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
vi.mock(
	"@/app/[locale]/(edit-layout)/[handle]/[pageSlug]/edit/_db/queries.server",
	() => ({
		getAllTagsWithCount: getAllTagsWithCountMock,
		getPageWithTitleAndTagsBySlug: getPageWithTitleAndTagsBySlugMock,
		getTranslationContextsByUserId: getTranslationContextsByUserIdMock,
	}),
);
vi.mock("@/app/_db/queries.server", () => ({
	getUserTargetLocales: getUserTargetLocalesMock,
}));

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
	it("空オブジェクト形式で保存された既存の原稿を開ける", async () => {
		getPageWithTitleAndTagsBySlugMock.mockResolvedValue({
			userId: currentUser.id,
			segments: [{ number: 0, text: "空の原稿" }],
			mdastJson: {},
		});
		await expect(getPageEditData({ data: input })).resolves.toMatchObject({
			markdown: "",
		});
	});
	it("保存済み本文を変換できない場合は空の編集画面を返さない", async () => {
		getPageWithTitleAndTagsBySlugMock.mockResolvedValue({
			userId: currentUser.id,
			segments: [{ text: "タイトル" }],
			mdastJson: {
				type: "root",
				children: [{ type: "unsupported-node", value: "既存の本文" }],
			},
		});
		await expect(getPageEditData({ data: input })).rejects.toThrow(
			/unsupported-node/,
		);
	});
	beforeEach(() => {
		vi.clearAllMocks();
		getCurrentUserFromHeadersMock.mockResolvedValue(currentUser);
		getAllTagsWithCountMock.mockResolvedValue([]);
		getTranslationContextsByUserIdMock.mockResolvedValue([]);
		getUserTargetLocalesMock.mockResolvedValue([]);
	});

	it("本人が未作成のslugを開くと新規ページ用データを返す", async () => {
		getPageWithTitleAndTagsBySlugMock.mockResolvedValue(undefined);

		await expect(getPageEditData({ data: input })).resolves.toEqual({
			allTagsWithCount: [],
			currentUser,
			markdown: "",
			initialTitle: undefined,
			pageSlug: "new-page",
			pageWithTitleAndTags: undefined,
			targetLocales: [],
			translationContexts: [],
			userLocale: "en",
		});
	});
});
