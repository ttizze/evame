import type { TipitakaFileMeta } from "../../types";

/**
 * Tipitakaファイルの本文/注釈書の種類からセグメントタイプIDを取得する
 */
export function findSegmentTypeIdForTipitakaPrimaryOrCommentary(
	primaryOrCommentary: TipitakaFileMeta["primaryOrCommentary"],
	primarySegmentTypeId: number,
	commentarySegmentTypeIdByLabel: Map<string, number>,
): number {
	const primaryOrCommentaryKey = primaryOrCommentary?.toUpperCase?.() ?? "";
	if (primaryOrCommentaryKey === "MULA" || primaryOrCommentaryKey === "OTHER") {
		return primarySegmentTypeId;
	}
	const commentaryLabel =
		primaryOrCommentaryKey.charAt(0) +
		primaryOrCommentaryKey.slice(1).toLowerCase();
	const commentarySegmentTypeId =
		commentarySegmentTypeIdByLabel.get(commentaryLabel);
	if (!commentarySegmentTypeId) {
		throw new Error(
			`Segment type not found for primary or commentary: ${primaryOrCommentary} (label: ${commentaryLabel})`,
		);
	}
	return commentarySegmentTypeId;
}
