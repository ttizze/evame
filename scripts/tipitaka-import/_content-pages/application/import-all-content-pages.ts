import type { TipitakaFileMeta } from "../../types";
import type { ParagraphAnchorMap } from "../_segment-annotations";
import { groupTipitakaFileMetasByPrimaryOrCommentary } from "../domain/file-metas/group-tipitaka-file-metas";
import { importContentPagesFromTipitakaFiles } from "./import-content-pages-from-tipitaka-files";

/**
 * すべてのコンテンツページをインポートする
 *
 * Tipitakaファイルのメタデータから、依存関係を保証しながら
 * 順次コンテンツページを作成します。
 *
 * **処理順序**:
 * 1. ページ順序生成関数の作成
 * 2. ファイルメタデータを種類ごとにグループ化
 * 3. Mula（本文）→ Atthakatha → Tika → Other の順で処理
 *    （注釈書が参照するムーラのアンカーセグメントが確実に存在することを保証）
 *
 * @param tipitakaFileMetas - Tipitakaファイルのメタデータ配列
 * @param categoryPageLookup - カテゴリページのパス → ページIDのルックアップマップ
 * @param rootPageId - ルートページのID
 * @param userId - ページを作成するユーザーのID
 */
export async function importAllContentPages(
	tipitakaFileMetas: TipitakaFileMeta[],
	categoryPageLookup: Map<string, number>,
	rootPageId: number,
	userId: string,
): Promise<void> {
	// 本文から順に処理できるように、本文/注釈書の種類順にソートしてから種類ごとにグループ化
	// Mula（本文）→ Atthakatha → Tika → Other の順で処理することで、
	// 注釈書が参照するムーラのアンカーセグメントが確実に存在することを保証
	const tipitakaFileMetasGroupedByKind =
		groupTipitakaFileMetasByPrimaryOrCommentary(tipitakaFileMetas);

	// Mulaファイルの段落番号 → アンカーセグメントIDのマッピングを保存
	const mulaAnchorMapByFileKey = new Map<string, ParagraphAnchorMap>();

	for (const [, tipitakaFileMetasOfKind] of tipitakaFileMetasGroupedByKind) {
		await importContentPagesFromTipitakaFiles({
			tipitakaFileMetas: tipitakaFileMetasOfKind,
			categoryPageLookup,
			rootPageId,
			userId,
			mulaAnchorMapByFileKey,
		});
	}
}
