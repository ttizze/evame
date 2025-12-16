import { sql } from "kysely";
import { db } from "@/db";

/**
 * Fetches popular tags based on usage count
 * Kyselyに移行済み
 * @param limit Maximum number of tags to return
 * @returns Array of popular tags with usage count
 */
export async function fetchPopularTags(limit: number) {
	const results = await db
		.selectFrom("tags")
		.leftJoin("tagPages", "tags.id", "tagPages.tagId")
		.select([
			"tags.id",
			"tags.name",
			sql<number>`count(tag_pages.page_id)::int`.as("pagesCount"),
		])
		.groupBy(["tags.id", "tags.name"])
		.orderBy(sql`count(tag_pages.page_id)`, "desc")
		.limit(limit)
		.execute();

	return results.map((r) => ({
		id: r.id,
		name: r.name,
		_count: {
			pages: r.pagesCount,
		},
	}));
}
