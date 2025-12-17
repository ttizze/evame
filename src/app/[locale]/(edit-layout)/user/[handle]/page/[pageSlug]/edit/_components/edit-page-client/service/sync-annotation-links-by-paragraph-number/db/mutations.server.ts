import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";

/**
 * 既存のアノテーションリンクを削除する
 * Kysely版に移行済み
 */
export async function deleteAnnotationLinks(
	tx: TransactionClient,
	annotationSegmentIds: number[],
): Promise<void> {
	await tx
		.deleteFrom("segmentAnnotationLinks")
		.where("annotationSegmentId", "in", annotationSegmentIds)
		.execute();
}

/**
 * アノテーションリンクを作成する
 * Kysely版に移行済み
 */
export async function createAnnotationLinks(
	tx: TransactionClient,
	linksToCreate: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}>,
): Promise<void> {
	await tx
		.insertInto("segmentAnnotationLinks")
		.values(linksToCreate)
		.onConflict((oc) => oc.doNothing())
		.execute();
}
