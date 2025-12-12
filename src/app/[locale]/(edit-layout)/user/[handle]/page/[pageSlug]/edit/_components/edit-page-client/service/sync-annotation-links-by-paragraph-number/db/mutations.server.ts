import { inArray } from "drizzle-orm";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { segmentAnnotationLinks } from "@/drizzle/schema";

/**
 * 既存のアノテーションリンクを削除する
 * Drizzle版に移行済み
 */
export async function deleteAnnotationLinks(
	tx: TransactionClient,
	annotationSegmentIds: number[],
): Promise<void> {
	await tx
		.delete(segmentAnnotationLinks)
		.where(
			inArray(segmentAnnotationLinks.annotationSegmentId, annotationSegmentIds),
		);
}

/**
 * アノテーションリンクを作成する
 * Drizzle版に移行済み
 */
export async function createAnnotationLinks(
	tx: TransactionClient,
	linksToCreate: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}>,
): Promise<void> {
	await tx
		.insert(segmentAnnotationLinks)
		.values(linksToCreate)
		.onConflictDoNothing();
}
