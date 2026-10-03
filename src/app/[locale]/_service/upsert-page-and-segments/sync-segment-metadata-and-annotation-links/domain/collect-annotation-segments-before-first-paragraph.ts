import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";

// 段落番号が付く最初のセグメントより前にある、注釈セグメントIDだけを集める
export function collectAnnotationSegmentsBeforeFirstParagraph(
	hashToSegmentId: Map<string, number>,
	segments: SegmentDraft[],
): Array<number> | null {
	const annotationSegmentIds: number[] = [];

	// segments はnumberで並んでいる前提（remarkHashAndSegments の走査順）なので､paragraphNumberが出る前のセグメントを利用する
	for (const segment of segments) {
		if (segment.paragraphNumber) {
			break;
		}

		const segmentId = hashToSegmentId.get(segment.textAndOccurrenceHash);
		if (!segmentId) {
			continue;
		}

		annotationSegmentIds.push(segmentId);
	}

	if (annotationSegmentIds.length === 0) {
		return null;
	}

	return annotationSegmentIds;
}
