import { CamelCasePlugin, ParseJSONResultsPlugin, sql } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/sqlite";
import { querySocialProofStats } from "@/app/[locale]/(common-layout)/_components/about-section/_db/queries";
import { db } from "@/db";

export function fetchReaderRevision() {
	return db
		.selectFrom("readerRevisions")
		.select("revision")
		.where("key", "=", "*")
		.executeTakeFirstOrThrow();
}

export async function fetchReaderCatalogSources() {
	// 1つの読み取りSQLで同じDBスナップショットを取得し、書き込みロックを持たない。
	return db
		.withoutPlugins()
		.withPlugin(new ParseJSONResultsPlugin())
		.withPlugin(new CamelCasePlugin())
		.selectNoFrom((eb) => [
			jsonObjectFrom(querySocialProofStats()).as("stats"),
			eb.fn
				.coalesce(
					eb
						.selectFrom("readerRevisions")
						.select("revision")
						.where("key", "=", "*"),
					eb.val(0),
				)
				.as("revision"),
			jsonArrayFrom(
				db
					.selectFrom("pages")
					.leftJoin("readerRevisions as revision", (join) =>
						join.on("revision.key", "=", sql<string>`'page:' || pages.id`),
					)
					.leftJoin("readerRevisions as navigation", (join) =>
						join.on("navigation.key", "=", sql<string>`'nav:' || pages.id`),
					)
					.select((eb) => [
						"pages.id",
						"pages.slug",
						"pages.userId",
						"pages.parentId",
						"pages.status",
						sql<number>`pages.created_at`.as("createdAt"),
						eb.fn.coalesce("revision.revision", eb.val(0)).as("revision"),
						eb.fn
							.coalesce("navigation.revision", eb.val(0))
							.as("navigationRevision"),
						eb
							.exists(
								eb
									.selectFrom("segments")
									.select("id")
									.whereRef("contentId", "=", "pages.id")
									.where("number", "=", 0),
							)
							.as("hasTitle"),
						eb
							.selectFrom("likePages")
							.select(eb.fn.countAll<number>().as("count"))
							.whereRef("pageId", "=", "pages.id")
							.as("likes"),
						eb
							.selectFrom("pageViews")
							.select("count")
							.whereRef("pageId", "=", "pages.id")
							.as("views"),
						eb
							.selectFrom("pageComments")
							.select(eb.fn.countAll<number>().as("count"))
							.whereRef("pageId", "=", "pages.id")
							.where("parentId", "is", null)
							.as("commentRoots"),
					])
					.orderBy("pages.id"),
			).as("pages"),
			jsonArrayFrom(
				db
					.selectFrom("users")
					.leftJoin("readerRevisions as revision", (join) =>
						join.on("revision.key", "=", sql<string>`'user:' || users.id`),
					)
					.select((eb) => [
						"users.id",
						"users.handle",
						eb.fn.coalesce("revision.revision", eb.val(0)).as("revision"),
					])
					.orderBy("users.id"),
			).as("users"),
			jsonArrayFrom(
				db
					.selectFrom("tagPages")
					.innerJoin("tags", "tags.id", "tagPages.tagId")
					.innerJoin("pages", "pages.id", "tagPages.pageId")
					.where("pages.status", "=", "PUBLIC")
					.select(["pageId", "tags.name"])
					.orderBy("tags.name")
					.orderBy("pageId"),
			).as("tags"),
			jsonArrayFrom(
				db
					.selectFrom("pageComments")
					.select(["pageId", "userId"])
					.distinct()
					.orderBy("pageId")
					.orderBy("userId"),
			).as("commentAuthors"),
			jsonArrayFrom(
				db
					.selectFrom("follows")
					.select(["followerId", "followingId"])
					.orderBy("followerId")
					.orderBy("followingId"),
			).as("follows"),
		])
		.executeTakeFirstOrThrow();
}
