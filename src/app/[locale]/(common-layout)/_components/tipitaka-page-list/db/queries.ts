import { bestTranslationByPagesSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";
import {
	extractTipitakaPageTree,
	TIPITAKA_ROOT_SLUG,
	TIPITAKA_SYSTEM_USER_HANDLE,
	type TipitakaPageRow,
	type TipitakaPageTreeNode,
} from "../domain/extract-tipitaka-page-tree";

/**
 * Tipiṭaka の正本ページを起点に、公開対象 PAGE の子孫を取得する。
 *
 * ルート自身はインポート仕様上英語 (`sourceLocale = en`) なので一覧には含めず、
 * ルートから辿れるパーリ語 (`sourceLocale = pi`) ページのうち、PUBLIC または
 * 公開日時がある ARCHIVE を返す。
 */
export async function fetchTipitakaPageTree(
	locale: string,
): Promise<TipitakaPageTreeNode[]> {
	const rootPage = await db
		.selectFrom("pages")
		.innerJoin("contents", "contents.id", "pages.id")
		.innerJoin("users", "users.id", "pages.userId")
		.select("pages.id")
		.where("pages.slug", "=", TIPITAKA_ROOT_SLUG)
		.where("users.handle", "=", TIPITAKA_SYSTEM_USER_HANDLE)
		.where("pages.parentId", "is", null)
		.where((eb) =>
			eb.or([
				eb("pages.status", "=", "PUBLIC"),
				eb.and([
					eb("pages.status", "=", "ARCHIVE"),
					eb("pages.publishedAt", "is not", null),
				]),
			]),
		)
		.where("contents.kind", "=", "PAGE")
		.executeTakeFirst();

	if (!rootPage) return [];

	const rows = await db
		.withRecursive("tipitakaDescendants", (qb) =>
			qb
				.selectFrom("pages")
				.innerJoin("contents", "contents.id", "pages.id")
				.innerJoin("users", "users.id", "pages.userId")
				.where("pages.parentId", "=", rootPage.id)
				.where((eb) =>
					eb.or([
						eb("pages.status", "=", "PUBLIC"),
						eb.and([
							eb("pages.status", "=", "ARCHIVE"),
							eb("pages.publishedAt", "is not", null),
						]),
					]),
				)
				.where("contents.kind", "=", "PAGE")
				.select([
					"pages.id",
					"pages.slug",
					"pages.parentId",
					"pages.order",
					"pages.publishedAt",
					"pages.sourceLocale",
					"pages.status",
					"contents.kind as contentKind",
					"pages.userId",
					"users.handle as userHandle",
				])
				.unionAll(
					qb
						.selectFrom("pages")
						.innerJoin("contents", "contents.id", "pages.id")
						.innerJoin("users", "users.id", "pages.userId")
						.innerJoin(
							"tipitakaDescendants",
							"pages.parentId",
							"tipitakaDescendants.id",
						)
						.where((eb) =>
							eb.or([
								eb("pages.status", "=", "PUBLIC"),
								eb.and([
									eb("pages.status", "=", "ARCHIVE"),
									eb("pages.publishedAt", "is not", null),
								]),
							]),
						)
						.where("contents.kind", "=", "PAGE")
						.select([
							"pages.id",
							"pages.slug",
							"pages.parentId",
							"pages.order",
							"pages.publishedAt",
							"pages.sourceLocale",
							"pages.status",
							"contents.kind as contentKind",
							"pages.userId",
							"users.handle as userHandle",
						]),
				),
		)
		.selectFrom("tipitakaDescendants")
		.innerJoin("segments", (join) =>
			join
				.onRef("segments.contentId", "=", "tipitakaDescendants.id")
				.on("segments.number", "=", 0),
		)
		.leftJoin(bestTranslationByPagesSubquery(locale).as("trans"), (join) =>
			join.onRef("trans.segmentId", "=", "segments.id"),
		)
		.select([
			"tipitakaDescendants.id",
			"tipitakaDescendants.slug",
			"tipitakaDescendants.parentId",
			"tipitakaDescendants.order",
			"tipitakaDescendants.publishedAt",
			"tipitakaDescendants.sourceLocale",
			"tipitakaDescendants.status",
			"tipitakaDescendants.contentKind",
			"tipitakaDescendants.userHandle",
			"segments.id as titleSegmentId",
			"segments.text as titleText",
			"trans.text as titleTranslationText",
		])
		.orderBy("tipitakaDescendants.parentId")
		.orderBy("tipitakaDescendants.order")
		.execute();

	return extractTipitakaPageTree(
		rows satisfies readonly TipitakaPageRow[],
		rootPage.id,
	);
}

export { TIPITAKA_SOURCE_LOCALE } from "../domain/extract-tipitaka-page-tree";
