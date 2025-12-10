import { count, desc, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { tagPages, tags } from "@/drizzle/schema";

/**
 * Fetches popular tags based on usage count
 * Drizzleに移行済み
 * @param limit Maximum number of tags to return
 * @returns Array of popular tags with usage count
 */
export async function fetchPopularTags(limit: number) {
	return await db
		.select({
			id: tags.id,
			name: tags.name,
			_count: {
				pages: count(tagPages.pageId),
			},
		})
		.from(tags)
		.leftJoin(tagPages, eq(tags.id, tagPages.tagId))
		.groupBy(tags.id, tags.name)
		.orderBy(desc(count(tagPages.pageId)))
		.limit(limit);
}
