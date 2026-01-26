import { bestTranslationByPagesSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import type { PageForTree } from "@/app/[locale]/types";
import { db } from "@/db";

export type PageTreeNode = PageForTree & {
	children: PageTreeNode[];
};

type NavigationData = {
	rootNode: PageForTree;
	treeNodes: PageTreeNode[];
	breadcrumb: PageForTree[];
};

/**
 * ページナビゲーションに必要なデータを1クエリで取得
 * - 親チェーン（パンくず用）
 * - ルートからの全子孫（ツリー用）
 */
export async function fetchPageNavigationData(
	pageId: number,
	locale: string,
): Promise<NavigationData | null> {
	// Step 1: 親チェーンを取得してルートを特定
	const breadcrumb = await db
		.withRecursive("ancestors", (qb) =>
			qb
				.selectFrom("pages")
				.select([
					"pages.id",
					"pages.slug",
					"pages.parentId",
					"pages.order",
					"pages.userId",
				])
				.where(
					"pages.id",
					"=",
					db.selectFrom("pages").select("parentId").where("id", "=", pageId),
				)
				.unionAll(
					qb
						.selectFrom("pages")
						.innerJoin("ancestors", "pages.id", "ancestors.parentId")
						.select([
							"pages.id",
							"pages.slug",
							"pages.parentId",
							"pages.order",
							"pages.userId",
						]),
				),
		)
		.selectFrom("ancestors")
		.innerJoin("users", "ancestors.userId", "users.id")
		.innerJoin("segments", (join) =>
			join
				.onRef("segments.contentId", "=", "ancestors.id")
				.on("segments.number", "=", 0),
		)
		.leftJoin(bestTranslationByPagesSubquery(locale).as("trans"), (join) =>
			join.onRef("trans.segmentId", "=", "segments.id"),
		)
		.select([
			"ancestors.id",
			"ancestors.slug",
			"ancestors.parentId",
			"ancestors.order",
			"users.handle as userHandle",
			"segments.id as titleSegmentId",
			"segments.text as titleText",
			"trans.text as titleTranslationText",
		])
		.execute();

	if (breadcrumb.length === 0) return null;

	const rootNode = breadcrumb[0];

	// Step 2: ルートからの全子孫を取得
	const descendantRows = await db
		.withRecursive("descendants", (qb) =>
			qb
				.selectFrom("pages")
				.select([
					"pages.id",
					"pages.slug",
					"pages.parentId",
					"pages.order",
					"pages.userId",
				])
				.where("pages.parentId", "=", rootNode.id)
				.where("pages.status", "=", "PUBLIC")
				.unionAll(
					qb
						.selectFrom("pages")
						.innerJoin("descendants", "pages.parentId", "descendants.id")
						.where("pages.status", "=", "PUBLIC")
						.select([
							"pages.id",
							"pages.slug",
							"pages.parentId",
							"pages.order",
							"pages.userId",
						]),
				),
		)
		.selectFrom("descendants")
		.innerJoin("users", "descendants.userId", "users.id")
		.innerJoin("segments", (join) =>
			join
				.onRef("segments.contentId", "=", "descendants.id")
				.on("segments.number", "=", 0),
		)
		.leftJoin(bestTranslationByPagesSubquery(locale).as("trans"), (join) =>
			join.onRef("trans.segmentId", "=", "segments.id"),
		)
		.select([
			"descendants.id",
			"descendants.slug",
			"descendants.parentId",
			"descendants.order",
			"users.handle as userHandle",
			"segments.id as titleSegmentId",
			"segments.text as titleText",
			"trans.text as titleTranslationText",
		])
		.execute();

	const treeNodes = buildTree(descendantRows, rootNode.id);

	return { rootNode, treeNodes, breadcrumb };
}

function buildTree(nodes: PageForTree[], parentId: number): PageTreeNode[] {
	const children = nodes
		.filter((n) => n.parentId === parentId)
		.sort((a, b) => a.order - b.order);
	return children.map((child) => ({
		...child,
		children: buildTree(nodes, child.id),
	}));
}
