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
import { addTranslationService } from "./add-translation.server";

await setupDbPerFile(import.meta.url);

describe("addTranslationService", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("コメントの翻訳を追加できる", async () => {
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

		const comment = await createPageComment({
			userId: user.id,
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

		// Act
		const result = await addTranslationService(
			commentSegment.id,
			"コメント翻訳",
			user.id,
			"ja",
		);

		// Assert
		expect(result.success).toBe(true);

		const translation = await db
			.selectFrom("segmentTranslations")
			.selectAll()
			.where("segmentId", "=", commentSegment.id)
			.where("locale", "=", "ja")
			.executeTakeFirst();

		expect(translation?.text).toBe("コメント翻訳");
	});
});
