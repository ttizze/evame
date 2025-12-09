import { db } from "@/db/kysely";

export interface PopularTag {
	id: number;
	name: string;
	_count: {
		pages: number;
	};
}

/**
 * Fetches popular tags based on usage count
 * @param limit Maximum number of tags to return
 * @returns Array of popular tags with usage count
 */
export async function fetchPopularTags(limit: number): Promise<PopularTag[]> {
	const tags = await db
		.selectFrom("tags")
		.leftJoin("tagPages", "tagPages.tagId", "tags.id")
		.select([
			"tags.id",
			"tags.name",
			({ fn }) => fn.count<number>("tagPages.pageId").as("pageCount"),
		])
		.groupBy(["tags.id", "tags.name"])
		.orderBy("pageCount", "desc")
		.limit(limit)
		.execute();

	return tags.map((tag) => ({
		id: tag.id,
		name: tag.name,
		_count: {
			pages: Number(tag.pageCount) || 0,
		},
	}));
}
