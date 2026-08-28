import { fetchPopularPagesByTag } from "@/app/[locale]/_db/page-search.server";
import type { PageForList } from "@/app/[locale]/types";

export interface FetchPaginatedPagesByTagParams {
	tagName: string;
	page?: number;
	pageSize?: number;
	locale?: string;
}

/**
 * タグ名でページを取得（人気順）
 */
export async function fetchPaginatedPublicPageListsByTag({
	tagName,
	page = 1,
	pageSize = 5,
	locale = "en",
}: FetchPaginatedPagesByTagParams): Promise<{
	pageForLists: PageForList[];
	totalPages: number;
}> {
	const skip = (page - 1) * pageSize;

	const { pageForLists, total } = await fetchPopularPagesByTag(
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
