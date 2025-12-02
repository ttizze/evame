import { createPageOrderGeneratorForParents } from "../../domain/create-page-order-generator";
import type { TipitakaFileMeta } from "../../types";
import type { ParagraphAnchorMap } from "../_segment-annotations";
import { groupTipitakaFileMetasByPrimaryOrCommentary } from "../domain/group-tipitaka-file-metas";
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
 * @param userId - ページを作成するユーザーのID
 * @param primarySegmentTypeId - PRIMARYセグメントタイプのID
 * @param commentarySegmentTypeIdByLabel - COMMENTARYセグメントタイプのlabel → IDのマッピング
 */
export async function importAllContentPages(
	tipitakaFileMetas: TipitakaFileMeta[],
	categoryPageLookup: Map<string, number>,
	userId: string,
	primarySegmentTypeId: number,
	commentarySegmentTypeIdByLabel: Map<string, number>,
): Promise<void> {
	// 親ページごとにページの表示順序を生成する関数（同じ親の下で0, 1, 2...と順序を割り当てる）
	const generatePageOrderForParent = createPageOrderGeneratorForParents();
	// 本文から順に処理できるように、本文/注釈書の種類順にソートしてから種類ごとにグループ化
	const tipitakaFileMetasGroupedByKind =
		groupTipitakaFileMetasByPrimaryOrCommentary(tipitakaFileMetas);

	// 本文から順に処理（依存関係を保証）、同じ種類のファイルは並列処理
	// Mula（本文）→ Atthakatha → Tika → Other の順で処理することで、
	// 注釈書が参照するムーラのアンカーセグメントが確実に存在することを保証
	const primaryOrCommentaryOrder: TipitakaFileMeta["primaryOrCommentary"][] = [
		"Mula", // 本文を最初に処理
		"Atthakatha",
		"Tika",
		"Other",
	];

	// Mulaファイルの段落番号 → アンカーセグメントIDのマッピングを保存
	const mulaAnchorMapByFileKey = new Map<string, ParagraphAnchorMap>();

	for (const primaryOrCommentary of primaryOrCommentaryOrder) {
		const tipitakaFileMetasOfKind =
			tipitakaFileMetasGroupedByKind.get(primaryOrCommentary);
		if (!tipitakaFileMetasOfKind) continue;

		await importContentPagesFromTipitakaFiles(
			primaryOrCommentary,
			tipitakaFileMetasOfKind,
			categoryPageLookup,
			userId,
			primarySegmentTypeId,
			commentarySegmentTypeIdByLabel,
			generatePageOrderForParent,
			mulaAnchorMapByFileKey,
		);
	}
}
