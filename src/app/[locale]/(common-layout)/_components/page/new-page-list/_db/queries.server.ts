import { unstable_cache } from "next/cache";
import { fetchPaginatedNewPageLists } from "@/app/[locale]/_db/page-list.server";

interface FetchTopPageNewPageListsParams {
	locale: string;
	page: number;
	pageSize: number;
}

export async function fetchPaginatedNewPageListsForTopPage({
	locale,
	page,
	pageSize,
}: FetchTopPageNewPageListsParams) {
	return await unstable_cache(
		() =>
			fetchPaginatedNewPageLists({
				locale,
				page,
				pageSize,
			}),
		["top:new-page-list", locale, String(page), String(pageSize)],
		{
			revalidate: 60 * 60 * 12,
			tags: [`top:new-page-list:${locale}:${page}:${pageSize}`],
		},
	)();
}
