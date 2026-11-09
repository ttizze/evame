import { sql } from "kysely";
import { db } from "@/db";

export async function fetchExportPageIds(userId: string) {
	return db
		.selectFrom("pages")
		.select("id")
		.where("userId", "=", userId)
		.orderBy("id")
		.execute();
}

export async function fetchExportPage(userId: string, pageId: number) {
	return db
		.selectFrom("pages")
		.select([
			"pages.id",
			"pages.slug",
			"pages.mdastJson",
			"pages.sourceLocale",
			"pages.status",
			"pages.commentsEnabled",
			"pages.parentId",
			"pages.publishedAt",
			"pages.createdAt",
			"pages.updatedAt",
		])
		.select((eb) => [
			eb
				.selectFrom("segments")
				.select("text")
				.whereRef("contentId", "=", "pages.id")
				.where("number", "=", 0)
				.limit(1)
				.as("title"),
			sql<string>`(select json_group_array(tags.name) from tag_pages join tags on tags.id = tag_pages.tag_id where tag_pages.page_id = pages.id)`.as(
				"tagsJson",
			),
		])
		.where("pages.userId", "=", userId)
		.where("pages.id", "=", pageId)
		.executeTakeFirst();
}
