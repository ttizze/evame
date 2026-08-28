import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";

/**
 * コンテンツのセグメントタイプを取得する
 */
export async function fetchSegmentTypeKey(
	tx: TransactionClient,
	contentId: number,
): Promise<string | undefined> {
	const currentSegment = await tx
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segmentTypes.id", "segments.segmentTypeId")
		.select("segmentTypes.key as segmentTypeKey")
		.where("segments.contentId", "=", contentId)
		.executeTakeFirst();

	return currentSegment?.segmentTypeKey;
}
