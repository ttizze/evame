import { createSegmentAnnotationLinks } from "../db/segment-annotation-links";

/**
 * 注釈セグメントを本文セグメントに直接リンクする
 *
 * @param annotationSegmentIds 注釈セグメントID配列
 * @param mainSegmentId 本文セグメントID（アンカー）
 */
export async function linkAnnotationSegments(
	annotationSegmentIds: number[],
	mainSegmentId: number,
): Promise<void> {
	const linkData = annotationSegmentIds.map((annotationSegmentId) => ({
		mainSegmentId,
		annotationSegmentId,
	}));

	await createSegmentAnnotationLinks(linkData);
}
