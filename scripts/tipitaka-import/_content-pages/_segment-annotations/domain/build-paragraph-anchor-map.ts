import type { SegmentRecord } from "../db/segments";
import type { ParagraphSegmentMap } from "./build-paragraph-segment-map";

/**
 * 段落番号 → アンカーセグメントIDのマッピング
 * （各段落番号について、最大ナンバーのセグメントID）
 */
export type ParagraphAnchorMap = Map<string, number>;

/**
 * 各段落番号について、最大ナンバーのセグメント（アンカーセグメント）を特定する
 *
 * @param paragraphNumberToSegmentIds 段落番号 → セグメントID配列のマッピング
 * @param segments セグメント配列
 * @returns 段落番号 → アンカーセグメントIDのマッピング
 */
export function buildParagraphAnchorMap(
	paragraphNumberToSegmentIds: ParagraphSegmentMap,
	segments: SegmentRecord[],
): ParagraphAnchorMap {
	const anchorMap: ParagraphAnchorMap = new Map();
	const segmentNumberById = new Map<number, number>();
	for (const segment of segments) {
		segmentNumberById.set(segment.id, segment.number);
	}

	for (const [paragraphNumber, segmentIds] of paragraphNumberToSegmentIds) {
		if (segmentIds.length === 0) continue;

		// 最大ナンバーのセグメントをアンカーとして選択
		const anchorSegmentId = segmentIds.reduce((maxId, currentId) => {
			const maxNumber = segmentNumberById.get(maxId) ?? -Infinity;
			const currentNumber = segmentNumberById.get(currentId) ?? -Infinity;
			return currentNumber > maxNumber ? currentId : maxId;
		});

		anchorMap.set(paragraphNumber, anchorSegmentId);
	}

	return anchorMap;
}
