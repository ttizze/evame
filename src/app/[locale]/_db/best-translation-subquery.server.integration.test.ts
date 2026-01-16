import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPageComment,
	createPageWithSegments,
	createSegment,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import {
	bestTranslationByCommentSubquery,
	bestTranslationByPagesSubquery,
} from "./best-translation-subquery.server";

await setupDbPerFile(import.meta.url);

describe("bestTranslationByPageSubquery", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

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
					segmentTypeKey: "PRIMARY",
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
		const result = await bestTranslationByPagesSubquery("ja").execute();

		// Assert
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(ownerUpvotedTranslation.id);
		expect(result[0].text).toBe("オーナー推奨翻訳");
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
					segmentTypeKey: "PRIMARY",
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
		const highPointTranslation = await db
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
		const result = await bestTranslationByPagesSubquery("ja").execute();

		// Assert
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(highPointTranslation.id);
		expect(result[0].text).toBe("高ポイント翻訳");
	});
});

describe("bestTranslationByCommentSubquery", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("コメントオーナーがupvoteした翻訳を優先する", async () => {
		// Arrange
		const pageOwner = await createUser({ handle: "page-owner" });
		const commentOwner = await createUser({ handle: "comment-owner" });
		const translator1 = await createUser({ handle: "translator1" });
		const translator2 = await createUser({ handle: "translator2" });

		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Title",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const comment = await createPageComment({
			userId: commentOwner.id,
			pageId: page.id,
			locale: "en",
		});

		const commentSegment = await createSegment({
			contentId: comment.id,
			number: 0,
			text: "Comment text",
			textAndOccurrenceHash: "comment-hash",
			segmentTypeKey: "COMMENTARY",
		});

		// 高ポイントの翻訳
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: commentSegment.id,
				locale: "ja",
				text: "高ポイント翻訳",
				point: 100,
				userId: translator1.id,
			})
			.execute();

		// 低ポイントだがコメントオーナーがupvoteした翻訳
		const ownerUpvotedTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: commentSegment.id,
				locale: "ja",
				text: "コメントオーナー推奨翻訳",
				point: 1,
				userId: translator2.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// コメントオーナーが低ポイント翻訳にupvote
		await db
			.insertInto("translationVotes")
			.values({
				translationId: ownerUpvotedTranslation.id,
				userId: commentOwner.id,
				isUpvote: true,
			})
			.execute();

		// Act
		const result = await bestTranslationByCommentSubquery("ja").execute();

		// Assert
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(ownerUpvotedTranslation.id);
		expect(result[0].text).toBe("コメントオーナー推奨翻訳");
	});

	it("ページオーナーのupvoteではなくコメントオーナーのupvoteを優先する", async () => {
		// Arrange
		const pageOwner = await createUser({ handle: "page-owner" });
		const commentOwner = await createUser({ handle: "comment-owner" });
		const translator1 = await createUser({ handle: "translator1" });
		const translator2 = await createUser({ handle: "translator2" });

		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Title",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const comment = await createPageComment({
			userId: commentOwner.id,
			pageId: page.id,
			locale: "en",
		});

		const commentSegment = await createSegment({
			contentId: comment.id,
			number: 0,
			text: "Comment text",
			textAndOccurrenceHash: "comment-hash",
			segmentTypeKey: "COMMENTARY",
		});

		// ページオーナーがupvoteした翻訳（高ポイント）
		const pageOwnerUpvotedTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: commentSegment.id,
				locale: "ja",
				text: "ページオーナー推奨",
				point: 100,
				userId: translator1.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		await db
			.insertInto("translationVotes")
			.values({
				translationId: pageOwnerUpvotedTranslation.id,
				userId: pageOwner.id,
				isUpvote: true,
			})
			.execute();

		// コメントオーナーがupvoteした翻訳（低ポイント）
		const commentOwnerUpvotedTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: commentSegment.id,
				locale: "ja",
				text: "コメントオーナー推奨",
				point: 1,
				userId: translator2.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		await db
			.insertInto("translationVotes")
			.values({
				translationId: commentOwnerUpvotedTranslation.id,
				userId: commentOwner.id,
				isUpvote: true,
			})
			.execute();

		// Act
		const result = await bestTranslationByCommentSubquery("ja").execute();

		// Assert
		expect(result).toHaveLength(1);
		// コメントオーナーのupvoteが優先される
		expect(result[0].id).toBe(commentOwnerUpvotedTranslation.id);
		expect(result[0].text).toBe("コメントオーナー推奨");
	});
});
