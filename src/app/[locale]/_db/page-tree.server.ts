import { bestTranslationByPagesSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";
import type { PageForTree } from "../types";

export type PageForTitleTree = PageForTree & { children: PageForTitleTree[] };

/**
 * 子ページツリーを取得（recursive CTEで1クエリ）
 */
export async function fetchChildPagesTree(
	parentId: number,
	locale: string,
): Promise<PageForTitleTree[]> {
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

	return buildTree(rows, parentId);
}

function buildTree(nodes: PageForTree[], parentId: number): PageForTitleTree[] {
	const children = nodes
		.filter((n) => n.parentId === parentId)
		.sort((a, b) => a.order - b.order);
	return children.map((child) => ({
		...child,
		children: buildTree(nodes, child.id),
	}));
}
