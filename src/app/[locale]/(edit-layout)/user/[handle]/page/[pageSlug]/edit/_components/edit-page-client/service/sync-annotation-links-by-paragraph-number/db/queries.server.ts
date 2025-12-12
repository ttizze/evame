import { and, eq, inArray } from "drizzle-orm";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import {
	segmentMetadata,
	segmentMetadataTypes,
	segments,
	segmentTypes,
} from "@/drizzle/schema";

/**
 * コンテンツのセグメントタイプを取得する
 * Drizzle版に移行済み
 */
export async function fetchSegmentTypeKey(
	tx: TransactionClient,
	contentId: number,
): Promise<string | undefined> {
	const [currentSegment] = await tx
		.select({
			segmentTypeKey: segmentTypes.key,
		})
		.from(segments)
		.innerJoin(segmentTypes, eq(segments.segmentTypeId, segmentTypes.id))
		.where(eq(segments.contentId, contentId))
		.limit(1);

	return currentSegment?.segmentTypeKey;
}

/**
 * 親ページのPRIMARYセグメントを取得（メタデータも取得して段落番号を取得）
 * Drizzle版に移行済み
 */
export async function fetchPrimarySegmentsWithParagraphNumbers(
	tx: TransactionClient,
	anchorContentId: number,
): Promise<
	Array<{
		id: number;
		number: number;
		metadata: Array<{ value: string }>;
	}>
> {
	// セグメントを取得
	const segmentRows = await tx
		.select({
			id: segments.id,
			number: segments.number,
		})
		.from(segments)
		.innerJoin(segmentTypes, eq(segments.segmentTypeId, segmentTypes.id))
		.where(
			and(
				eq(segments.contentId, anchorContentId),
				eq(segmentTypes.key, "PRIMARY"),
			),
		)
		.orderBy(segments.number);

	// 各セグメントのメタデータを取得
	const segmentIds = segmentRows.map((s) => s.id);
	if (segmentIds.length === 0) {
		return [];
	}

	// PARAGRAPH_NUMBERメタデータタイプのIDを取得
	const [paragraphNumberType] = await tx
		.select({ id: segmentMetadataTypes.id })
		.from(segmentMetadataTypes)
		.where(eq(segmentMetadataTypes.key, "PARAGRAPH_NUMBER"))
		.limit(1);

	if (!paragraphNumberType) {
		// メタデータタイプが存在しない場合は空のメタデータ配列を返す
		return segmentRows.map((s) => ({ ...s, metadata: [] }));
	}

	// メタデータを取得
	const metadataRows = await tx
		.select({
			segmentId: segmentMetadata.segmentId,
			value: segmentMetadata.value,
		})
		.from(segmentMetadata)
		.where(
			and(
				eq(segmentMetadata.metadataTypeId, paragraphNumberType.id),
				inArray(segmentMetadata.segmentId, segmentIds),
			),
		);

	// segmentIdごとにメタデータをグループ化
	const metadataMap = new Map<number, Array<{ value: string }>>();
	for (const meta of metadataRows) {
		const existing = metadataMap.get(meta.segmentId) || [];
		metadataMap.set(meta.segmentId, [...existing, { value: meta.value }]);
	}

	// 結果を構築
	return segmentRows.map((segment) => ({
		id: segment.id,
		number: segment.number,
		metadata: metadataMap.get(segment.id) || [],
	}));
}
