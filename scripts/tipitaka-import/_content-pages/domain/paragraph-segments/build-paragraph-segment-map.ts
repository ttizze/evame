import type { SegmentRecord } from "../../_segment-annotations/db/segments";
import { extractFirstParagraphNumber } from "../../_segment-annotations/domain/extract-first-paragraph-number";

/**
 * 段落番号 → セグメントID配列のマッピング
 */
export type ParagraphSegmentMap = Map<string, number[]>;

/**
 * コンテンツ内のセグメントを段落番号でグループ化する
 *
 * セグメントのテキストから段落番号を抽出し、
 * その段落番号が出現してから次の段落番号が出現するまでの
 * すべてのセグメントを同じグループに分類する。
 *
 * @param segments セグメント配列
 * @returns 段落番号 → セグメントID配列のマッピング
 */
export function buildParagraphSegmentMap(
	segments: SegmentRecord[],
): ParagraphSegmentMap {
	// セグメントID → 段落番号のマッピングを作成
	const paragraphNumberBySegmentId = new Map<number, string>();
	for (const segment of segments) {
		const paragraphNumber = extractFirstParagraphNumber(segment.text);
		if (paragraphNumber) {
			paragraphNumberBySegmentId.set(segment.id, paragraphNumber);
		}
	}

	const paragraphNumberToSegmentIds: ParagraphSegmentMap = new Map();
	let currentParagraphNumber: string | null = null;

	// セグメントを順番に処理し、段落番号でグループ化
	// 段落番号が出現したらそれを現在の段落番号として保持し、
	// 次の段落番号が出現するまで同じグループに分類する
	for (const segment of segments) {
		const paragraphNumber = paragraphNumberBySegmentId.get(segment.id) ?? null;
		if (paragraphNumber) {
			currentParagraphNumber = paragraphNumber;
		}
		if (!currentParagraphNumber) continue;

		const segmentIds =
			paragraphNumberToSegmentIds.get(currentParagraphNumber) ?? [];
		segmentIds.push(segment.id);
		paragraphNumberToSegmentIds.set(currentParagraphNumber, segmentIds);
	}

	return paragraphNumberToSegmentIds;
}
