import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPageWithSegments,
	createSegment,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchNotificationRowsWithRelations } from "./queries.server";

await setupDbPerFile(import.meta.url);

describe("fetchNotificationRowsWithRelations", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("コメント通知2種を正しいページとアクター情報付きで返す", async () => {
		const recipient = await createUser({ handle: "notification-recipient" });
		const pageOwner = await createUser({
			handle: "notification-page-owner",
			name: "Page Owner",
		});
		const commentActor = await createUser({
			handle: "notification-comment-actor",
			name: "Comment Actor",
			image: "https://example.com/comment-actor.png",
		});
		const translationActor = await createUser({
			handle: "notification-translation-actor",
			name: "Translation Actor",
			image: "https://example.com/translation-actor.png",
		});
		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "comment-notification-page",
			segments: [
				{
					number: 0,
					text: "Comment Notification Page",
					textAndOccurrenceHash: "comment-notification-title",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "Comment notification segment",
					textAndOccurrenceHash: "comment-notification-segment",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const commentContent = await db
			.insertInto("contents")
			.values({ kind: "PAGE_COMMENT" })
			.returningAll()
			.executeTakeFirstOrThrow();
		const comment = await db
			.insertInto("pageComments")
			.values({
				id: commentContent.id,
				pageId: page.id,
				locale: "en",
				userId: commentActor.id,
				parentId: null,
				mdastJson: { type: "root", children: [] },
				lastReplyAt: null,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		const segment = await createSegment({
			contentId: comment.id,
			number: 0,
			text: "Comment notification comment",
			textAndOccurrenceHash: "comment-notification-comment",
			segmentTypeKey: "PRIMARY",
		});
		const translation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "Comment translation",
				userId: translationActor.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		await db
			.insertInto("notifications")
			.values([
				{
					userId: recipient.id,
					actorId: commentActor.id,
					type: "PAGE_COMMENT",
					pageCommentId: comment.id,
					pageId: null,
					segmentTranslationId: null,
				},
				{
					userId: recipient.id,
					actorId: translationActor.id,
					type: "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
					pageCommentId: comment.id,
					pageId: null,
					segmentTranslationId: translation.id,
				},
			])
			.execute();

		const notifications = await fetchNotificationRowsWithRelations(
			recipient.handle,
		);

		expect(notifications).toHaveLength(2);
		expect(notifications).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "PAGE_COMMENT",
					actorId: commentActor.id,
					actorHandle: "notification-comment-actor",
					actorName: "Comment Actor",
					actorImage: "https://example.com/comment-actor.png",
					pageSlug: "comment-notification-page",
					pageOwnerHandle: "notification-page-owner",
					pageTitle: "Comment Notification Page",
					segmentTranslationText: null,
				}),
				expect.objectContaining({
					type: "PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
					actorId: translationActor.id,
					actorHandle: "notification-translation-actor",
					actorName: "Translation Actor",
					actorImage: "https://example.com/translation-actor.png",
					pageSlug: "comment-notification-page",
					pageOwnerHandle: "notification-page-owner",
					pageTitle: "Comment Notification Page",
					segmentTranslationText: "Comment translation",
				}),
			]),
		);
	});
});
