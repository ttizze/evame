import { describe, expect, it } from "vitest";
import { extractTipitakaPageTree } from "./extract-tipitaka-page-tree";

describe("extractTipitakaPageTree", () => {
	it("公開日時があるARCHIVEのパーリ語ページをTipiṭaka一覧に含める", () => {
		const rows = [
			{
				contentKind: "PAGE" as const,
				id: 2,
				order: 1,
				parentId: 1,
				publishedAt: new Date("2026-01-01T00:00:00.000Z"),
				slug: "vinaya-pitaka",
				sourceLocale: "pi",
				status: "ARCHIVE" as const,
				titleSegmentId: 20,
				titleText: "Vinayapiṭaka",
				titleTranslationText: null,
				userHandle: "evame",
			},
		];

		expect(extractTipitakaPageTree(rows, 1)).toMatchObject([
			{ id: 2, slug: "vinaya-pitaka" },
		]);
	});
});
