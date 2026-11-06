import { bestTranslationId } from "@/app/[locale]/_db/best-translation-subquery.server";
import type { PageForTree } from "@/app/[locale]/types";
import { db } from "@/db";

export type PageTreeNode = PageForTree & {
	children: PageTreeNode[];
};

export type NavigationData = {
	rootNode: PageForTree;
	treeNodes: PageTreeNode[];
	breadcrumb: PageForTree[];
};

/**
 * ページナビゲーションに必要なデータを1クエリで取得
 * - 親チェーン（パンくず用）
 * - ルートからの全子孫（ツリー用）
 */
export async function queryPageNavigationData(
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
		// CTEの対象記事から引き、SQLiteが全段落の走査を外側に選ばないようにする。
		.crossJoin("segments")
		.whereRef("segments.contentId", "=", "ancestors.id")
		.where("segments.number", "=", 0)
		.leftJoin("segmentTranslations as trans", (join) =>
			join.on("trans.id", "=", (eb) =>
				bestTranslationId(
					eb.ref("segments.id"),
					eb.ref("ancestors.userId"),
					locale,
				),
			),
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
		// CTEの対象記事から引き、SQLiteが全段落の走査を外側に選ばないようにする。
		.crossJoin("segments")
		.whereRef("segments.contentId", "=", "descendants.id")
		.where("segments.number", "=", 0)
		.leftJoin("segmentTranslations as trans", (join) =>
			join.on("trans.id", "=", (eb) =>
				bestTranslationId(
					eb.ref("segments.id"),
					eb.ref("descendants.userId"),
					locale,
				),
			),
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

/** 子ページの公開対象ツリーを取得（recursive CTEで1クエリ） */
export async function queryChildPagesTree(
	parentId: number,
	locale: string,
): Promise<PageTreeNode[]> {
	const rows = await db
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
				.where("pages.parentId", "=", parentId)
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
		// CTEの対象記事から引き、SQLiteが全段落の走査を外側に選ばないようにする。
		.crossJoin("segments")
		.whereRef("segments.contentId", "=", "descendants.id")
		.where("segments.number", "=", 0)
		.leftJoin("segmentTranslations as trans", (join) =>
			join.on("trans.id", "=", (eb) =>
				bestTranslationId(
					eb.ref("segments.id"),
					eb.ref("descendants.userId"),
					locale,
				),
			),
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

	return buildTree(rows, parentId);
}

/** 最新値が必要なページのいいね数を取得 */
export async function queryPageCounts(pageId: number) {
	const result = await db
		.selectFrom("pages")
		.select((eb) => [
			eb
				.selectFrom("likePages")
				.select(eb.fn.countAll<number>().as("count"))
				.whereRef("likePages.pageId", "=", "pages.id")
				.as("likeCount"),
		])
		.where("pages.id", "=", pageId)
		.executeTakeFirst();

	return { likeCount: result?.likeCount ?? 0 };
}

/** ページの閲覧数を取得 */
export async function queryPageViewCount(pageId: number): Promise<number> {
	const result = await db
		.selectFrom("pageViews")
		.select("count")
		.where("pageId", "=", pageId)
		.executeTakeFirst();
	return result?.count ?? 0;
}

/** 完了済み翻訳ジョブのlocaleを取得 */
export async function queryCompletedTranslationLocales(
	pageId: number,
): Promise<string[]> {
	const jobs = await db
		.selectFrom("translationJobs")
		.select("locale")
		.distinct()
		.where("pageId", "=", pageId)
		.where("status", "=", "COMPLETED")
		.orderBy("locale")
		.execute();

	return jobs.map((job) => job.locale);
}

function buildTree(nodes: PageForTree[], parentId: number): PageTreeNode[] {
	const children = nodes
		.filter((node) => node.parentId === parentId)
		.sort((a, b) => a.order - b.order);
	return children.map((child) => ({
		...child,
		children: buildTree(nodes, child.id),
	}));
}
