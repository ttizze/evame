import type { TipitakaFileMeta } from "../../types";
import { extractOrderFromFileKey } from "./extract-order-from-file-key";

/**
 * 本文から順に処理できるように、Tipitakaファイルのメタデータを本文/注釈書の種類順にソートする
 * Mula（本文）→ Atthakatha → Tika → Other の順に並べる
 */
export function sortTipitakaFileMetasFromPrimary(
	tipitakaFileMetas: TipitakaFileMeta[],
): TipitakaFileMeta[] {
	const primaryOrCommentaryOrder: Record<
		TipitakaFileMeta["primaryOrCommentary"],
		number
	> = {
		Mula: 0,
		Atthakatha: 1,
		Tika: 2,
		Other: 3,
	};

	return [...tipitakaFileMetas].sort((fileMetaA, fileMetaB) => {
		const orderDiff =
			primaryOrCommentaryOrder[fileMetaA.primaryOrCommentary] -
			primaryOrCommentaryOrder[fileMetaB.primaryOrCommentary];
		if (orderDiff !== 0) return orderDiff;
		const orderA = extractOrderFromFileKey(fileMetaA.fileKey);
		const orderB = extractOrderFromFileKey(fileMetaB.fileKey);
		if (orderA !== orderB) return orderA - orderB;
		return fileMetaA.fileKey.localeCompare(fileMetaB.fileKey);
	});
}
