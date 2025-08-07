// to-segment-bundles.spec.ts

import { expect, test } from "vitest";
import { toSegmentBundles } from "@/app/[locale]/_lib/to-segment-bundles";
import { mockUsers } from "@/tests/mock";

/* ---------- RawSegment 型と合致する fixture ---------- */
const rawSegments = [
	{
		id: 1,
		number: 0,
		text: "segment‑text",
		segmentTranslations: [
			{
				id: 11,
				locale: "en",
				text: "A",
				point: 1,
				createdAt: new Date("2024-01-01"),
				user: mockUsers[0],
				currentUserVote: null,
			},
			{
				id: 12,
				locale: "en",
				text: "B",
				point: 2,
				createdAt: new Date("2024-01-02"),
				user: mockUsers[0],
				currentUserVote: { isUpvote: true, updatedAt: new Date("2024-01-03") },
			},
		],
	},
];

/* ---------- テスト ---------- */
test("toSegmentBundles converts and selects best translation", () => {
	const bundles = toSegmentBundles("pageComment", 99, rawSegments);

	// 構造チェック
	expect(bundles).toHaveLength(1);
	expect(bundles[0]).toMatchObject({
		parentType: "pageComment",
		parentId: 99,
		segment: { id: 1, number: 0, text: "segment‑text" },
	});

	// translations は ISO 文字列化されている
	expect(typeof bundles[0].segmentTranslation?.createdAt).toBe("string");

	// best は upvote の付いた id=12
	expect(bundles[0].segmentTranslation?.id).toBe(12);
	expect(bundles[0].segmentTranslation?.point).toBe(2);
});
