import { parseDirSegment } from "../../domain/parse-dir-segment/parse-dir-segment";
import type { TipitakaFileMeta } from "../../types";
import { extractUniqueCategoryPaths } from "../utils/extract-unique-category-paths";
import { getLastSegment } from "../utils/get-last-segment";
import { getParentPath } from "../utils/get-parent-path";
import { sortPathsByDepth } from "../utils/sort-paths-by-depth";
import { createCategoryPage } from "./create-category-page";

/**
 * カテゴリページを階層的に作成する
 *
 * Tipitakaファイルのメタデータからユニークなパスを抽出し、
 * 子ノードがあるパスに対してカテゴリページをデータベースに作成します。
 * 親ページが子ページよりも先に作成される順序を保証します。
 *
 * **作成されるページの特徴**:
 * - タイトルのみのMarkdownページ（本文なし）
 * - スラグ形式: `tipitaka-{dirPath}` (例: `tipitaka-01-sutta/02-diggha-nikaya`)
 * - 親ページとの階層関係が設定される
 * - 同じ親の下で順序が自動的に割り当てられる（0, 1, 2...）
 *
 * @param tipitakaFileMetas - Tipitakaファイルのメタデータ配列
 * @param rootPageId - ルートページのID
 * @param userId - ページを作成するユーザーのID
 * @returns カテゴリページのパス → ページIDのルックアップマップ
 */
export async function createCategoryPages(
	tipitakaFileMetas: TipitakaFileMeta[],
	rootPageId: number,
	userId: string,
): Promise<Map<string, number>> {
	// すべてのユニークなパスを抽出（子ノードがある場合のみ）
	const pathSet = extractUniqueCategoryPaths(tipitakaFileMetas);

	// パスを配列に変換し、長さでソート（親→子の順序）
	const paths = sortPathsByDepth(pathSet);

	// ページIDのルックアップマップ
	const categoryPageLookup = new Map<string, number>();

	// 順番にカテゴリページを作成
	for (const dirPath of paths) {
		const lastSegment = getLastSegment(dirPath);
		const parentPath = getParentPath(dirPath);

		// 親ページIDを取得（親パスが空の場合はルートページ、それ以外はルックアップから取得）
		const parentId = categoryPageLookup.get(parentPath) ?? rootPageId;

		// 最後のセグメントからタイトルと順序を抽出（ディレクトリ名の先頭数字が順序）
		const { title, order } = parseDirSegment(lastSegment);

		// カテゴリページを作成
		const pageId = await createCategoryPage({
			title,
			dirPath,
			parentId,
			userId,
			order,
		});

		categoryPageLookup.set(dirPath, pageId);
	}

	// ルートページもルックアップに追加
	categoryPageLookup.set("", rootPageId);

	return categoryPageLookup;
}
