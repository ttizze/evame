import { db } from "@/db";

/**
 * セグメント翻訳IDからページIDを取得
 * ページのセグメントとコメントのセグメントの両方に対応
 */
export async function findPageIdBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<number> {
	// ページのセグメントとコメントのセグメントの両方に対応
	// LEFT JOINでどちらかにマッチさせ、COALESCEでページIDを取得
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

	const id = result?.pageId;
	if (!id) {
		throw new Error("Page not found");
	}
	return id;
}
