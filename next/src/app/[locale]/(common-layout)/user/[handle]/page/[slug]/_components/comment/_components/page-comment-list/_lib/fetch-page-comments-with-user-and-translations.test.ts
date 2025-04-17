import {
	pageCommentSegmentFactory,
	pageCommentSegmentTranslationFactory,
	pageCommentWithPageCommentSegmentsFactory,
} from "@/tests/factory";
// fetch-page-comments-with-user-and-translations.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPageCommentsWithPageCommentSegments } from "../_db/queries.server";
import {
	buildCommentTree,
	fetchPageCommentsWithUserAndTranslations,
	mapCommentTranslations,
} from "./fetch-page-comments-with-user-and-translations";
// --- 依存先をモック化 ---
vi.mock("../_db/queries.server", () => ({
	fetchPageCommentsWithPageCommentSegments: vi.fn(),
}));
// -------------- buildCommentTree テスト -------------- //
describe("buildCommentTree", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should build a tree from flat comments", async () => {
		const flatComments = [
			pageCommentWithPageCommentSegmentsFactory.build({
				id: 1,
				parentId: null,
			}),
			pageCommentWithPageCommentSegmentsFactory.build({ id: 2, parentId: 1 }),
			pageCommentWithPageCommentSegmentsFactory.build({
				id: 3,
				parentId: null,
			}),
		];
		const tree = await buildCommentTree(flatComments);

		// トップレベルは id=1, id=3 → 2件
		expect(tree).toHaveLength(2);
		const comment1 = tree.find((comment) => comment.id === 1);
		const comment3 = tree.find((comment) => comment.id === 3);
		expect(comment1?.replies).toHaveLength(1);
		expect(comment1?.replies?.[0].id).toBe(2);
		expect(comment3?.replies).toHaveLength(0);
	});
});

// -------------- mapCommentTranslations テスト -------------- //
describe("mapCommentTranslations", () => {
	it("should map translations with best translation", async () => {
		const translation1 = pageCommentSegmentTranslationFactory.build({
			text: "translation1",
			point: 1001,
		});
		const translation2 = pageCommentSegmentTranslationFactory.build({
			text: "translation1",
			point: 1002,
		});
		const translations = [translation1, translation2];
		const segments = pageCommentSegmentFactory.buildList(
			2,
			{},
			{ transient: { customTranslations: translations } },
		);
		const comment = pageCommentWithPageCommentSegmentsFactory.build(
			{}, // フィールドの直接オーバーライドがある場合はここ
			{ transient: { customSegments: segments } }, // transientParams
		);

		const result = await mapCommentTranslations(comment);
		expect(
			result.pageCommentSegmentsWithTranslations[0]
				.bestSegmentTranslationWithVote?.point,
		).toBe(1002);
	});
});

// -------------- fetchPageCommentsWithUserAndTranslations テスト -------------- //
describe("fetchPageCommentsWithUserAndTranslations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should fetch flat comments, build tree, and map translations", async () => {
		const mockPageComments =
			pageCommentWithPageCommentSegmentsFactory.buildList(1);
		vi.mocked(fetchPageCommentsWithPageCommentSegments).mockResolvedValue(
			mockPageComments,
		);
		const result = await fetchPageCommentsWithUserAndTranslations(
			mockPageComments[0].id,
			"ja",
			"u1",
		);

		expect(result).toHaveLength(1);
		expect(result[0].replies).toBeDefined();
		expect(result[0].pageCommentSegmentsWithTranslations).toBeDefined();
	});
});
