import { expect, test } from "vitest";
import { buildCommentTree } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-list/_lib/fetch-page-comments-with-user-and-translations";
import { mockUsers } from "@/tests/mock";
import type { PageCommentWithSegments } from "../_db/queries.server";

test("buildCommentTree should handle comments with segments", async () => {
	// コメントのセグメント構造をテスト（現在のスキーマに合わせて修正）
	const commentsWithSegments = [
		{
			id: 1,
			parentId: null,
			mdastJson: {},
			locale: "en",
			userId: "user1",
			pageId: 1,
			contentId: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			user: {
				handle: "testuser",
				name: "Test User",
				image: "https://example.com/image.jpg",
			},
			content: {
				segments: [
					{
						id: 1,
						number: 0,
						text: "s",
						segmentTranslation: {
							id: 2,
							locale: "en",
							text: "B",
							point: 2,
							createdAt: new Date(),
							user: mockUsers[0],
						},
					},
				],
			},
		},
	] as unknown as PageCommentWithSegments[];

	const tree = await buildCommentTree(commentsWithSegments);

	expect(tree).toHaveLength(1);
	expect(tree[0].id).toBe(1);
	expect(tree[0].content.segments[0].segmentTranslation?.point).toBe(2);
});

test("parent–child nesting", async () => {
	const flat = [
		{
			id: 1,
			parentId: null,
			mdastJson: {},
			locale: "en",
			userId: "user1",
			pageId: 1,
			contentId: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
			user: {
				handle: "testuser",
				name: "Test User",
				image: "https://example.com/image.jpg",
			},
			content: {
				segments: [],
			},
		},
		{
			id: 2,
			parentId: 1,
			mdastJson: {},
			locale: "en",
			userId: "user2",
			pageId: 1,
			contentId: 2,
			createdAt: new Date(),
			updatedAt: new Date(),
			user: {
				handle: "testuser2",
				name: "Test User 2",
				image: "https://example.com/image2.jpg",
			},
			content: {
				segments: [],
			},
		},
	] as unknown as PageCommentWithSegments[];
	const tree = await buildCommentTree(flat);
	expect(tree).toHaveLength(1);
	expect(tree[0].replies?.[0]?.id).toBe(2);
});
