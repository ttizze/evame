/**
 * PRIMARYセグメントから段落番号→セグメントIDのマッピングを作成する
 *
 * 各段落番号について、最大numberのセグメントをアンカーとして選択する
 */
export function buildParagraphMapping(
	primarySegments: Array<{
		id: number;
		number: number;
		metadata: Array<{ value: string }>;
	}>,
): Map<string, number> {
	const paragraphNumberToPrimarySegmentId = new Map<string, number>();
	const paragraphNumberToSegmentCandidates = new Map<
		string,
		Array<{ id: number; number: number }>
	>();

	// 段落番号ごとに候補を集める
	for (const segment of primarySegments) {
		// メタデータから段落番号を取得（PARAGRAPH_NUMBERタイプでフィルタ済み）
		const paragraphNumberMetadata = segment.metadata[0];
		if (!paragraphNumberMetadata) continue;

		const paragraphNumber = paragraphNumberMetadata.value;
		const candidates =
			paragraphNumberToSegmentCandidates.get(paragraphNumber) ?? [];
		candidates.push({ id: segment.id, number: segment.number });
		paragraphNumberToSegmentCandidates.set(paragraphNumber, candidates);
	}

	// 各段落番号について、最大numberのセグメントをアンカーとして選択
	for (const [
		paragraphNumber,
		candidates,
	] of paragraphNumberToSegmentCandidates) {
		const anchorSegment = candidates.reduce((max, current) =>
			current.number > max.number ? current : max,
		);
		paragraphNumberToPrimarySegmentId.set(paragraphNumber, anchorSegment.id);
	}

	return paragraphNumberToPrimarySegmentId;
}
