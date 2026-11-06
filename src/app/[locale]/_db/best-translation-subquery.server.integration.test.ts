import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { queryPageDetail } from "./queries";

await setupDbPerFile(import.meta.url);

describe("段落ごとの最良翻訳", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it.each([false, true])(
		"同点なら新しい日時、同じ日時なら大きいIDの翻訳を1件選ぶ（日時一致: %s）",
		async (sameTime) => {
			const owner = await createUser();
			const page = await createPageWithSegments({
				userId: owner.id,
				slug: "tied-translations",
				segments: [
					{ number: 0, text: "Title", textAndOccurrenceHash: "title" },
					{
						number: 1,
						text: "Without translation",
						textAndOccurrenceHash: "body",
					},
				],
			});
			const segment = await db
				.selectFrom("segments")
				.select("id")
				.where("contentId", "=", page.id)
				.where("number", "=", 0)
				.executeTakeFirstOrThrow();
			await db
				.insertInto("segmentTranslations")
				.values([
					{
						segmentId: segment.id,
						locale: "ja",
						text: "古い翻訳",
						point: 10,
						userId: owner.id,
						createdAt: new Date("2026-01-01T00:00:00Z"),
					},
					{
						segmentId: segment.id,
						locale: "ja",
						text: "選ばれる翻訳",
						point: 10,
						userId: owner.id,
						createdAt: new Date(
							sameTime ? "2026-01-01T00:00:00Z" : "2026-02-01T00:00:00Z",
						),
					},
					{
						segmentId: segment.id,
						locale: "en",
						text: "別言語の高得点",
						point: 1000,
						userId: owner.id,
						createdAt: new Date("2026-03-01T00:00:00Z"),
					},
				])
				.execute();
			const result = await queryPageDetail(page.slug, "ja");
			expect(
				result?.segments.map(({ translationText }) => translationText),
			).toEqual(["選ばれる翻訳", null]);
		},
	);

	it("ページオーナーがupvoteした翻訳を優先する", async () => {
		// Arrange
		const pageOwner = await createUser({ handle: "owner" });
		const translator1 = await createUser({ handle: "translator1" });
		const translator2 = await createUser({ handle: "translator2" });

		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
				},
			],
		});

		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		// 高ポイントの翻訳
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "高ポイント翻訳",
				point: 100,
				userId: translator1.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// 低ポイントだがオーナーがupvoteした翻訳
		const ownerUpvotedTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "オーナー推奨翻訳",
				point: 1,
				userId: translator2.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// オーナーが低ポイント翻訳にupvote
		await db
			.insertInto("translationVotes")
			.values({
				translationId: ownerUpvotedTranslation.id,
				userId: pageOwner.id,
				isUpvote: true,
			})
			.execute();

		// Act
		const result = await queryPageDetail(page.slug, "ja");

		// Assert
		expect(result?.segments).toHaveLength(1);
		expect(result?.segments[0].translationText).toBe("オーナー推奨翻訳");
	});

	it("オーナーのupvoteがない場合はポイント順", async () => {
		// Arrange
		const pageOwner = await createUser({ handle: "owner" });
		const translator1 = await createUser({ handle: "translator1" });
		const translator2 = await createUser({ handle: "translator2" });

		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
				},
			],
		});

		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		// 高ポイントの翻訳
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "高ポイント翻訳",
				point: 100,
				userId: translator1.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// 低ポイントの翻訳
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "低ポイント翻訳",
				point: 1,
				userId: translator2.id,
			})
			.execute();

		// Act
		const result = await queryPageDetail(page.slug, "ja");

		// Assert
		expect(result?.segments).toHaveLength(1);
		expect(result?.segments[0].translationText).toBe("高ポイント翻訳");
	});
});
