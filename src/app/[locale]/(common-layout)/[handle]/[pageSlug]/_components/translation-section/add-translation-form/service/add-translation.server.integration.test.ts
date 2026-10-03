import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { addTranslationService } from "./add-translation.server";

await setupDbPerFile(import.meta.url);

describe("addTranslationService", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("ページの翻訳を追加できる", async () => {
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

		const pageSegment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		// Act
		const result = await addTranslationService(
			pageSegment.id,
			"ページ翻訳",
			user.id,
			"ja",
		);

		// Assert
		expect(result.success).toBe(true);

		const translation = await db
			.selectFrom("segmentTranslations")
			.selectAll()
			.where("segmentId", "=", pageSegment.id)
			.where("locale", "=", "ja")
			.executeTakeFirst();

		expect(translation?.text).toBe("ページ翻訳");
	});
});
