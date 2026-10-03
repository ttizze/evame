import { db } from "@/db";

/**
 * セグメント翻訳IDから所属ページIDを取得する。
 * ページ本文だけでなくコメントのセグメントにも対応する。
 */
export async function findPageIdBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<number> {
	const result = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.leftJoin("pages", "segments.contentId", "pages.id")
		.leftJoin("pageComments", "segments.contentId", "pageComments.id")
		.select((eb) =>
			eb.fn.coalesce("pages.id", "pageComments.pageId").as("pageId"),
		)
		.where("segmentTranslations.id", "=", segmentTranslationId)
		.executeTakeFirst();

	if (!result?.pageId) throw new Error("Page not found");
	return result.pageId;
}
