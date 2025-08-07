import { expect, test } from "vitest";
import { toSegmentBundles } from "@/app/[locale]/_lib/to-segment-bundles";
import {
	buildCommentTree,
	normalizeCommentSegments,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/_lib/fetch-page-comments-with-user-and-translations";
import { mockUsers } from "@/tests/mock";
import type { PageCommentWithPageCommentSegments } from "../_db/queries.server";

test("normalize → SegmentBundle keeps best", () => {
	// rawSegs を normalize にそのまま渡せる構造で作成
	const rawSegs = [
		{
			id: 1,
			number: 0,
			text: "s",
			pageCommentSegmentTranslations: [
				{
					id: 2,
					locale: "en",
					text: "B",
					point: 2,
					createdAt: new Date(), // ← Date 型
					user: mockUsers[0],
				},
			],
		},
	] as const satisfies Parameters<typeof normalizeCommentSegments>[0];
	const bundles = toSegmentBundles(
		"pageComment",
		99,
		normalizeCommentSegments(rawSegs),
	);

	expect(bundles[0].segmentTranslation?.point).toBe(2);
});

test("parent–child nesting", async () => {
	const flat = [
		{ id: 1, parentId: null },
		{ id: 2, parentId: 1 },
	] as unknown as PageCommentWithPageCommentSegments[];
	const tree = await buildCommentTree(flat);
	expect(tree).toHaveLength(1);
	expect(tree[0].replies?.[0]?.id).toBe(2);
});
