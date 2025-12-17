import { db } from "@/db";

export async function findPageIdBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<number> {
	const result = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.innerJoin("contents", "segments.contentId", "contents.id")
		.innerJoin("pages", "contents.id", "pages.id")
		.select("pages.id as pageId")
		.where("segmentTranslations.id", "=", segmentTranslationId)
		.executeTakeFirst();

	const id = result?.pageId;
	if (!id) {
		throw new Error("Page not found");
	}
	return id;
}
