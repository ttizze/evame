import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";

/**
 * 親ページのPRIMARYセグメントを取得（メタデータも取得して段落番号を取得）
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
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segmentTypes.id", "segments.segmentTypeId")
		.select(["segments.id", "segments.number"])
		.where("segments.contentId", "=", anchorContentId)
		.where("segmentTypes.key", "=", "PRIMARY")
		.orderBy("segments.number")
		.execute();

	// 各セグメントのメタデータを取得
	const segmentIds = segmentRows.map((s) => s.id);
	if (segmentIds.length === 0) {
		return [];
	}

	// PARAGRAPH_NUMBERメタデータタイプのIDを取得
	const paragraphNumberType = await tx
		.selectFrom("segmentMetadataTypes")
		.select("id")
		.where("key", "=", "PARAGRAPH_NUMBER")
		.executeTakeFirst();

	if (!paragraphNumberType) {
		// メタデータタイプが存在しない場合は空のメタデータ配列を返す
		return segmentRows.map((s) => ({ ...s, metadata: [] }));
	}

	// メタデータを取得
	const metadataRows = await tx
		.selectFrom("segmentMetadata")
		.select(["segmentId", "value"])
		.where("metadataTypeId", "=", paragraphNumberType.id)
		.where("segmentId", "in", segmentIds)
		.execute();

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

/**
 * 親ページの最初の段落番号の前にある最後のセグメントIDを取得
 */
export async function fetchLastSegmentBeforeFirstParagraphId(
	tx: TransactionClient,
	anchorContentId: number,
): Promise<number | null> {
	const paragraphNumberType = await tx
		.selectFrom("segmentMetadataTypes")
		.select("id")
		.where("key", "=", "PARAGRAPH_NUMBER")
		.executeTakeFirst();

	if (!paragraphNumberType) {
		return null;
	}

	const firstParagraph = await tx
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segmentTypes.id", "segments.segmentTypeId")
		.innerJoin("segmentMetadata", "segmentMetadata.segmentId", "segments.id")
		.select(["segments.id", "segments.number"])
		.where("segments.contentId", "=", anchorContentId)
		.where("segmentTypes.key", "=", "PRIMARY")
		.where("segmentMetadata.metadataTypeId", "=", paragraphNumberType.id)
		.orderBy("segments.number")
		.executeTakeFirst();

	if (!firstParagraph) {
		return null;
	}

	const row = await tx
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segmentTypes.id", "segments.segmentTypeId")
		.select("segments.id")
		.where("segments.contentId", "=", anchorContentId)
		.where("segmentTypes.key", "=", "PRIMARY")
		.where("segments.number", "<", firstParagraph.number)
		.orderBy("segments.number", "desc")
		.executeTakeFirst();

	return row?.id ?? null;
}
