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
import { findPageIdBySegmentTranslationId } from "./queries.server";

await setupDbPerFile(import.meta.url);

describe("findPageIdBySegmentTranslationId", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("ページのセグメント翻訳からページIDを取得できる", async () => {
		// Arrange
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
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

		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		const translation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "タイトル",
				point: 0,
				userId: user.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Act
		const result = await findPageIdBySegmentTranslationId(translation.id);

		// Assert
		expect(result).toBe(page.id);
	});

	it("コメントのセグメント翻訳からページIDを取得できる", async () => {
		// Arrange
		const user = await createUser();
		const page = await createPageWithSegments({
			userId: user.id,
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

		// コメントを作成
		const comment = await createPageComment({
			userId: user.id,
			pageId: page.id,
			locale: "en",
		});

		// コメント用のセグメントを作成
		const commentSegment = await createSegment({
			contentId: comment.id,
			number: 0,
			text: "Comment text",
			textAndOccurrenceHash: "comment-hash",
			segmentTypeKey: "COMMENTARY",
		});

		const translation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: commentSegment.id,
				locale: "ja",
				text: "コメント翻訳",
				point: 0,
				userId: user.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// Act
		const result = await findPageIdBySegmentTranslationId(translation.id);

		// Assert
		expect(result).toBe(page.id);
	});

	it("存在しない翻訳IDの場合はエラーを投げる", async () => {
		// Act & Assert
		await expect(findPageIdBySegmentTranslationId(999999)).rejects.toThrow(
			"Page not found",
		);
	});
});
