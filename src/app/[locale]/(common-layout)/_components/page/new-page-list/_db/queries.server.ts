import { cacheLife, cacheTag } from "next/cache";
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
	"use cache";
	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag(`top:new-page-list:${locale}:${page}:${pageSize}`);

	return await fetchPaginatedNewPageLists({
		locale,
		page,
		pageSize,
	});
}
