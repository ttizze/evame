import { unstable_cache } from "next/cache";
import { fetchPaginatedPopularPageLists } from "@/app/[locale]/_db/page-list.server";

interface FetchTopPagePopularPageListsParams {
	locale: string;
	page: number;
	pageSize: number;
}

export async function fetchPaginatedPopularPageListsForTopPage({
	locale,
	page,
	pageSize,
}: FetchTopPagePopularPageListsParams) {
	return await unstable_cache(
		() =>
			fetchPaginatedPopularPageLists({
				locale,
				page,
				pageSize,
			}),
		["top:popular-page-list", locale, String(page), String(pageSize)],
		{
			revalidate: 60 * 60 * 12,
			tags: [`top:popular-page-list:${locale}:${page}:${pageSize}`],
		},
	)();
}
