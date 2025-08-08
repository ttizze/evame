// to-segment-bundles.spec.ts

import { expect, test } from "vitest";
import { toBaseSegmentBundles } from "@/app/[locale]/_lib/to-base-segment-bundles";
import { mockUsers } from "@/tests/mock";

/* ---------- RawSegment 型と合致する fixture ---------- */
const rawSegments = [
	{
		id: 1,
		number: 0,
		text: "segment-text",
		segmentTranslation: {
			id: 11,
			locale: "en",
			text: "A",
			point: 1,
			createdAt: new Date("2024-01-01"),
			user: mockUsers[0],
		},
	},
];

/* ---------- テスト ---------- */
test("toSegmentBundles converts and selects best translation", () => {
	const bundles = toBaseSegmentBundles("pageComment", 99, rawSegments);

	// 構造チェック
	expect(bundles).toHaveLength(1);
	expect(bundles[0]).toMatchObject({
		parentType: "pageComment",
		parentId: 99,
		id: 1,
		number: 0,
		text: "segment-text",
	});

	// segmentTranslation の値チェック
	expect(bundles[0].segmentTranslation?.id).toBe(11);
	expect(bundles[0].segmentTranslation?.point).toBe(1);
});
