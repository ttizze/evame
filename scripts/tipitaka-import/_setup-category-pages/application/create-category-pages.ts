import type { CategoryNode } from "../../types";
import { createCategoryPage } from "./create-category-page";

/**
 * カテゴリページを階層的に作成する
 *
 * カテゴリツリーを再帰的に走査し、子ノードを持つ各ノードに対して
 * カテゴリページをデータベースに作成します。
 * 親ページが子ページよりも先に作成される順序を保証します。
 *
 * **作成されるページの特徴**:
 * - タイトルのみのMarkdownページ（本文なし）
 * - スラグ形式: `tipitaka-{dirPath}` (例: `tipitaka-01-sutta/02-diggha-nikaya`)
 * - 親ページとの階層関係が設定される
 * - 同じ親の下で順序が自動的に割り当てられる（0, 1, 2...）
 *
 * @param categoryTreeRootNode - カテゴリツリー全体を含むルートノード（pageIdが設定されていること）
 * @param userId - ページを作成するユーザーのID
 * @param primarySegmentTypeId - セグメントタイプのID
 */
export async function createCategoryPages(
	categoryTreeRootNode: CategoryNode,
	userId: string,
	primarySegmentTypeId: number,
): Promise<void> {
	async function traverse(
		node: CategoryNode,
		parent: CategoryNode,
		dirPath: string,
		pageOrder: number,
	): Promise<void> {
		// 子ノードがない場合はスキップ（リーフノードはページを作成しない）
		if (node.children.size === 0) return;

		// 親ノードのpageIdが設定されていることを確認
		const parentPageId = parent.pageId;
		if (!parentPageId) {
			throw new Error(
				`Parent category node must have pageId set. dirPath: ${dirPath}`,
			);
		}

		// カテゴリページを作成
		// この関数は node.pageId に作成されたページのIDを設定する
		await createCategoryPage({
			node,
			dirPath,
			parentId: parentPageId,
			userId,
			order: pageOrder,
			segmentTypeId: primarySegmentTypeId,
		});

		// 子ノードを順序番号でソートして再帰的に処理
		const sortedChildren = [...node.children.values()].sort(
			(a, b) => a.order - b.order,
		);
		for (let i = 0; i < sortedChildren.length; i++) {
			const child = sortedChildren[i];
			await traverse(child, node, `${dirPath}/${child.dirSegment}`, i);
		}
	}

	// ルートノードの子ノードから開始
	const sortedRootChildren = [...categoryTreeRootNode.children.values()].sort(
		(a, b) => a.order - b.order,
	);
	for (let i = 0; i < sortedRootChildren.length; i++) {
		const child = sortedRootChildren[i];
		await traverse(child, categoryTreeRootNode, child.dirSegment, i);
	}
}
