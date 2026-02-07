import { cacheLife, cacheTag } from "next/cache";
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
	"use cache";
	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag(`top:popular-page-list:${locale}:${page}:${pageSize}`);

	return await fetchPaginatedPopularPageLists({
		locale,
		page,
		pageSize,
	});
}
