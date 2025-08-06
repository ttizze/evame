import { searchPagesByTag } from "@/app/[locale]/_db/page-list-queries.server";
import type { PageForList } from "@/app/[locale]/types";

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
	const skip = (page - 1) * pageSize;

	const { pageForLists, total } = await searchPagesByTag(
		tagName,
		skip,
		pageSize,
		locale,
	);

	return {
		pageForLists,
		totalPages: Math.ceil(total / pageSize),
	};
}
