import { findSegmentsByContentId, type SegmentRecord } from "../db/segments";

export async function getSegmentsForContent(
	contentId: number,
): Promise<SegmentRecord[]> {
	return findSegmentsByContentId(contentId);
}
