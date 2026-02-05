import {
	buildPageListQuery,
	fetchTagsMap,
	toPageForList,
} from "@/app/[locale]/_db/page-list.server";
import type { PageForList } from "@/app/[locale]/types";
import { db } from "@/db";

export interface FetchPaginatedNewestPagesByTagParams {
	tagName: string;
	page?: number;
	pageSize?: number;
	locale?: string;
}

/**
 * Fetch paginated public page summaries filtered by given tag name and ordered by newest (createdAt desc).
 */
export async function fetchPaginatedPublicNewestPageListsByTag({
	tagName,
	page = 1,
	pageSize = 5,
	locale = "en",
}: FetchPaginatedNewestPagesByTagParams): Promise<{
	pageForLists: PageForList[];
	totalPages: number;
}> {
	const offset = (page - 1) * pageSize;

	const [rows, totalResult] = await Promise.all([
		buildPageListQuery(locale)
			.innerJoin("tagPages", "tagPages.pageId", "pages.id")
			.innerJoin("tags", "tagPages.tagId", "tags.id")
			.where("tags.name", "=", tagName)
			.where("pages.status", "=", "PUBLIC")
			.orderBy("pages.createdAt", "desc")
			.limit(pageSize)
			.offset(offset)
			.execute(),
		db
			.selectFrom("tagPages")
			.innerJoin("tags", "tagPages.tagId", "tags.id")
			.innerJoin("pages", "tagPages.pageId", "pages.id")
			.select((eb) =>
				eb.fn.count<number>("tagPages.pageId").distinct().as("count"),
			)
			.where("tags.name", "=", tagName)
			.where("pages.status", "=", "PUBLIC")
			.executeTakeFirst(),
	]);

	const pageIds = rows.map((row) => row.id);
	const tagsMap = await fetchTagsMap(pageIds);
	const pageForLists = rows.map((row) =>
		toPageForList(row, tagsMap.get(row.id) || []),
	);

	return {
		pageForLists,
		totalPages: Math.ceil(Number(totalResult?.count ?? 0) / pageSize),
	};
}
