import type { TipitakaFileMeta } from "../../../types";
import { sortTipitakaFileMetasFromPrimary } from "./sort-tipitaka-file-metas";

/**
 * 本文から順に処理するために、Tipitakaファイルのメタデータをソートしてから種類ごとにグループ化する
 * ソートにより、種類順（Mula → Atthakatha → Tika → Other）かつ同じ種類内でもfileKey順に並ぶ
 * グループ化により、種類ごとにO(1)で取得できるMapに変換（各種類内の順序も保持される）
 */
export function groupTipitakaFileMetasByPrimaryOrCommentary(
	tipitakaFileMetas: TipitakaFileMeta[],
): Map<TipitakaFileMeta["primaryOrCommentary"], TipitakaFileMeta[]> {
	// まずソートしてからグループ化することで、各種類内の順序も保持される
	const sortedTipitakaFileMetas =
		sortTipitakaFileMetasFromPrimary(tipitakaFileMetas);

	const tipitakaFileMetasByPrimaryOrCommentary = new Map<
		TipitakaFileMeta["primaryOrCommentary"],
		TipitakaFileMeta[]
	>();
	for (const tipitakaFileMeta of sortedTipitakaFileMetas) {
		const primaryOrCommentary = tipitakaFileMeta.primaryOrCommentary;
		const fileMetasOfKind =
			tipitakaFileMetasByPrimaryOrCommentary.get(primaryOrCommentary);
		if (fileMetasOfKind) {
			fileMetasOfKind.push(tipitakaFileMeta);
		} else {
			tipitakaFileMetasByPrimaryOrCommentary.set(primaryOrCommentary, [
				tipitakaFileMeta,
			]);
		}
	}
	return tipitakaFileMetasByPrimaryOrCommentary;
}
