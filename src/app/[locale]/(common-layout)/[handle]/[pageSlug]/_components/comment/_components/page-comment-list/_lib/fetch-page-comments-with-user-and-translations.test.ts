import { describe, expect, it } from "vitest";
import type { PageCommentWithSegments } from "../_db/queries.server";
import { buildCommentTree } from "./fetch-page-comments-with-user-and-translations";

function comment(id: number, parentId: number | null): PageCommentWithSegments {
	return {
		id,
		pageId: 1,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		locale: "ja",
		userId: `user-${id}`,
		parentId,
		mdastJson: {},
		isDeleted: false,
		lastReplyAt: null,
		replyCount: 0,
		user: {
			handle: `user-${id}`,
			name: `利用者${id}`,
			image: "https://example.com/image.jpg",
		},
		content: { segments: [] },
	};
}

describe("コメントツリー表示", () => {
	it("セグメント翻訳を保持したまま親子へ入れ子にする", () => {
		const parent = comment(1, null);
		parent.content.segments.push({
			id: 10,
			contentId: 1,
			number: 0,
			text: "原文",
			segmentTypeKey: "PRIMARY",
			segmentTypeLabel: "本文",
			translationText: "翻訳",
		});
		const tree = buildCommentTree([parent, comment(2, 1)]);

		expect(tree).toHaveLength(1);
		expect(tree[0].content.segments[0]?.translationText).toBe("翻訳");
		expect(tree[0].replies?.map((reply) => reply.id)).toEqual([2]);
	});

	it("存在しない親のコメントは公開トップレベルへ昇格しない", () => {
		const tree = buildCommentTree([comment(3, 999)]);

		expect(tree).toHaveLength(0);
	});
});
