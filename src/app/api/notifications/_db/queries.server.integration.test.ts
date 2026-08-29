import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchNotificationRowsWithRelations } from "./queries.server";

await setupDbPerFile(import.meta.url);

describe("fetchNotificationRowsWithRelations", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("フォロー、ページいいね、ページ翻訳投票をページ情報付きで返す", async () => {
		const recipient = await createUser({ handle: "notification-recipient" });
		const actor = await createUser({
			handle: "notification-actor",
			name: "Notification Actor",
			image: "https://example.com/actor.png",
		});
		const page = await createPageWithSegments({
			userId: recipient.id,
			slug: "notification-page",
			segments: [
				{
					number: 0,
					text: "Notification Page",
					textAndOccurrenceHash: "notification-title",
					segmentTypeKey: "PRIMARY",
				},
				{
					number: 1,
					text: "Notification segment",
					textAndOccurrenceHash: "notification-segment",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const segment = await db
			.selectFrom("segments")
			.select("id")
			.where("contentId", "=", page.id)
			.where("number", "=", 1)
			.executeTakeFirstOrThrow();
		const translation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "翻訳された通知セグメント",
				userId: recipient.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		await db
			.insertInto("notifications")
			.values([
				{
					userId: recipient.id,
					actorId: actor.id,
					type: "FOLLOW",
				},
				{
					userId: recipient.id,
					actorId: actor.id,
					type: "PAGE_LIKE",
					pageId: page.id,
				},
				{
					userId: recipient.id,
					actorId: actor.id,
					type: "PAGE_SEGMENT_TRANSLATION_VOTE",
					segmentTranslationId: translation.id,
				},
			])
			.execute();

		const notifications = await fetchNotificationRowsWithRelations(
			recipient.handle,
		);

		expect(notifications).toHaveLength(3);
		expect(notifications).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "FOLLOW",
					actorId: actor.id,
					actorHandle: "notification-actor",
				}),
				expect.objectContaining({
					type: "PAGE_LIKE",
					pageSlug: "notification-page",
					pageOwnerHandle: "notification-recipient",
					pageTitle: "Notification Page",
				}),
				expect.objectContaining({
					type: "PAGE_SEGMENT_TRANSLATION_VOTE",
					segmentTranslationText: "翻訳された通知セグメント",
					pageSlug: "notification-page",
					pageTitle: "Notification Page",
				}),
			]),
		);
	});
});
