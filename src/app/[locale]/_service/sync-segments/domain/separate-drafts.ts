import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { ExistingSegment } from "../types";

/**
 * 変更が必要なドラフトと変更不要なドラフトを分離する
 * 戻り値: { draftsNeedingUpsert: 新規作成または更新が必要なドラフト（既存にない、または内容が変更された）, unchangedSegmentIdsByHash: 変更不要で既存のまま残るセグメントのハッシュ→IDマッピング }
 */
export function separateDraftsByChangeStatus(
	chunk: SegmentDraft[],
	existingSegmentsByHash: Map<string, ExistingSegment>,
): {
	draftsNeedingUpsert: SegmentDraft[];
	unchangedSegmentIdsByHash: Map<string, number>;
} {
	// draftsNeedingUpsert: SegmentDraft[]（新規作成または更新が必要なドラフト）
	const draftsNeedingUpsert: SegmentDraft[] = [];
	// unchangedSegmentIdsByHash: Map<string, number>（ハッシュ（string） → セグメントID（number））
	const unchangedSegmentIdsByHash = new Map<string, number>();

	for (const draft of chunk) {
		const existingSegment = existingSegmentsByHash.get(
			draft.textAndOccurrenceHash,
		);

		// 既存セグメントが存在し、textとnumberが同じ場合は変更不要
		if (
			existingSegment &&
			existingSegment.text === draft.text &&
			existingSegment.number === draft.number
		) {
			unchangedSegmentIdsByHash.set(
				draft.textAndOccurrenceHash,
				existingSegment.id,
			);
		} else {
			// 新規作成または更新が必要なドラフト（既存にない、または内容が変更された）
			draftsNeedingUpsert.push(draft);
		}
	}

	return { draftsNeedingUpsert, unchangedSegmentIdsByHash };
}
