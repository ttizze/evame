/**
 * 段落番号ごとにセグメントIDをグループ化する（純粋ロジック）
 *
 * @param hashToSegmentId ハッシュ → セグメントIDのマッピング
 * @param segments セグメントドラフトの配列
 * @returns 段落番号 → セグメントID配列のマッピング
 */
export function groupByParagraphNumber(
	hashToSegmentId: Map<string, number>,
	segments: Array<{ textAndOccurrenceHash: string; paragraphNumber?: string }>,
): Map<string, number[]> {
	const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>();

	for (const segment of segments) {
		if (!segment.paragraphNumber) {
			continue;
		}

		const segmentId = hashToSegmentId.get(segment.textAndOccurrenceHash);
		if (!segmentId) {
			continue;
		}

		// 段落番号ごとにセグメントIDをグループ化
		const existing =
			paragraphNumberToAnnotationSegmentIds.get(segment.paragraphNumber) ?? [];
		existing.push(segmentId);
		paragraphNumberToAnnotationSegmentIds.set(
			segment.paragraphNumber,
			existing,
		);
	}

	return paragraphNumberToAnnotationSegmentIds;
}
