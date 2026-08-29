import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";

/**
 * セグメントメタデータのドラフト型
 */
export type MetadataDraft = {
	segmentId: number;
	items: Array<{ typeKey: string; value: string }>;
};

/**
 * SegmentDraftからメタデータドラフトを収集する（純粋ロジック）
 *
 * @param hashToSegmentId ハッシュ → セグメントIDのマッピング
 * @param segments セグメントドラフトの配列
 * @returns メタデータドラフトの配列
 */
export function collectMetadataDrafts(
	hashToSegmentId: Map<string, number>,
	segments: SegmentDraft[],
): MetadataDraft[] {
	const metadataDrafts: MetadataDraft[] = [];

	for (const segment of segments) {
		const segmentId = hashToSegmentId.get(segment.textAndOccurrenceHash);
		if (!segmentId) {
			continue;
		}

		// 既存のメタデータアイテムを取得
		const items: Array<{ typeKey: string; value: string }> = [
			...(segment.metadata?.items ?? []),
		];

		// 段落番号がある場合はメタデータとして追加（PRIMARYセグメントとCOMMENTARYセグメントの両方）
		if (segment.paragraphNumber) {
			items.push({
				typeKey: "PARAGRAPH_NUMBER",
				value: segment.paragraphNumber,
			});
		}

		// メタデータアイテムがある場合のみドラフトに追加
		if (items.length > 0) {
			metadataDrafts.push({ segmentId, items });
		}
	}

	return metadataDrafts;
}
