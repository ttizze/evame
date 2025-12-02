import type { PageWithContent, TipitakaFileMeta } from "../../types";
import { buildCategoryPageLookup } from "../domain/build-category-page-lookup/build-category-page-lookup";
import { buildCategoryTree } from "../domain/build-category-tree";
import { createCategoryPages } from "./create-category-pages";

/**
 * カテゴリページのセットアップを行う
 *
 * Tipitakaファイルのメタデータからカテゴリツリーを構築し、
 * カテゴリページを作成してルックアップマップを返す。
 *
 * **処理の流れ**:
 * 1. Tipitakaファイルのメタデータからカテゴリツリーを構築
 * 2. ルートノードに対応するルートページのIDを設定
 * 3. カテゴリページを階層的に作成（親→子の順序）
 * 4. 生成したカテゴリページのルックアップマップを作成して返す
 *
 * @param tipitakaFileMetas - Tipitakaファイルのメタデータ配列
 * @param rootPage - ルートページ（既に作成済み）
 * @param userId - ページを作成するユーザーのID
 * @param primarySegmentTypeId - セグメントタイプのID
 * @returns カテゴリページのパス → ページIDのルックアップマップ
 */
export async function setupCategoryPages(
	tipitakaFileMetas: TipitakaFileMeta[],
	rootPage: PageWithContent,
	userId: string,
	primarySegmentTypeId: number,
): Promise<Map<string, number>> {
	// カテゴリツリーを構築
	const categoryTreeRootNode = buildCategoryTree(tipitakaFileMetas);
	// ルートノードに対応する既存のルートページのIDを設定（カテゴリページ作成時に親として使用）
	categoryTreeRootNode.pageId = rootPage.id;

	// カテゴリページを作成していく
	// ツリー全体のルートノードを渡し、その下の階層構造を親→子の順に処理する
	await createCategoryPages(categoryTreeRootNode, userId, primarySegmentTypeId);

	// 生成したカテゴリページを素早く引き当てられるようにマッピングする
	return buildCategoryPageLookup(categoryTreeRootNode, rootPage);
}
