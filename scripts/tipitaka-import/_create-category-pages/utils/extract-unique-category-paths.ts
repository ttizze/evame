import type { TipitakaFileMeta } from "../../types";

/**
 * Tipitakaファイルのメタデータから、カテゴリページを作成すべきユニークなパスを抽出する
 *
 * **重要な注意**: 最後のセグメントは抽出しません。
 * 理由: 最後のセグメントはコンテンツページのタイトルになるため、
 * カテゴリページではなくコンテンツページとして作成されます。
 * これはCST（CST4）の仕様に合わせた実装です。
 *
 * @param tipitakaFileMetas - Tipitakaファイルのメタデータ配列
 * @returns ユニークなパスのセット（最後のセグメントを除く）
 *
 * @example
 * // dirSegments: ["01-tipitaka-mula", "01-sutta-pitaka", "03-samyutta-nikaya", "04-salayatanavaggapali"]
 * // 抽出されるパス: ["01-tipitaka-mula", "01-tipitaka-mula/01-sutta-pitaka", "01-tipitaka-mula/01-sutta-pitaka/03-samyutta-nikaya"]
 * // 最後の "04-salayatanavaggapali" はコンテンツページのタイトルになるため、カテゴリページには含まれない
 */
export function extractUniqueCategoryPaths(
	tipitakaFileMetas: TipitakaFileMeta[],
): Set<string> {
	const pathSet = new Set<string>();
	for (const meta of tipitakaFileMetas) {
		for (let i = 0; i < meta.dirSegments.length - 1; i++) {
			const path = meta.dirSegments.slice(0, i + 1).join("/");
			pathSet.add(path);
		}
	}
	return pathSet;
}
