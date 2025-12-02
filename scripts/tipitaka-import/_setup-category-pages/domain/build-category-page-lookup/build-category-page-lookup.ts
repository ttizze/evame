import type { CategoryNode, PageWithContent } from "../../../types";
import { collectPathMap } from "./collect-path-map";

/**
 * カテゴリページのパス → ページIDのルックアップマップを作成する
 *
 * @param root ディレクトリツリーのルートノード
 * @param rootPage ルートページ（PageWithContent）
 * @returns パス → ページIDのマッピング
 */
export function buildCategoryPageLookup<
	T extends { id: number } = PageWithContent,
>(root: CategoryNode, rootPage: T): Map<string, number> {
	const dirPathToNodeMap = collectPathMap(root);
	const categoryPageLookup = new Map<string, number>([["", rootPage.id]]);
	for (const [dirPath, categoryNode] of dirPathToNodeMap.entries()) {
		if (!categoryNode.pageId) {
			continue;
		}
		categoryPageLookup.set(dirPath, categoryNode.pageId);
	}
	return categoryPageLookup;
}
