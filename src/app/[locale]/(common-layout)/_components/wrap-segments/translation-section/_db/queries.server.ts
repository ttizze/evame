import { db } from "@/db/kysely";

export async function findPageIdBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<number> {
	const result = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
		.innerJoin("contents", "contents.id", "segments.contentId")
		.innerJoin("pages", "pages.id", "contents.id")
		.select(["pages.id"])
		.where("segmentTranslations.id", "=", segmentTranslationId)
		.executeTakeFirst();

	if (!result?.id) {
		throw new Error("Page not found");
	}
	return result.id;
}
