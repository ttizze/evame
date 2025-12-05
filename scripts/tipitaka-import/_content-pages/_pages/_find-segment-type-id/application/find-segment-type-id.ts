import type { TipitakaFileMeta } from "../../../../types";
import { findCommentarySegmentTypeId } from "../db/segment-types";
import { formatCommentaryLabel } from "../utils/format-commentary-label";

/**
 * Tipitakaファイルの本文/注釈書の種類からセグメントタイプIDを取得する
 * primary の場合は undefined を返す
 */
export async function findSegmentTypeIdForTipitakaPrimaryOrCommentary(
	primaryOrCommentary: TipitakaFileMeta["primaryOrCommentary"],
): Promise<number | null> {
	const normalizedKey = primaryOrCommentary.toUpperCase();

	if (normalizedKey === "MULA" || normalizedKey === "OTHER") {
		return null;
	}

	const label = formatCommentaryLabel(normalizedKey);
	try {
		return await findCommentarySegmentTypeId(label);
	} catch (error) {
		throw new Error(
			`Segment type not found for primary or commentary: ${primaryOrCommentary} (label: ${label})`,
			{ cause: error },
		);
	}
}
