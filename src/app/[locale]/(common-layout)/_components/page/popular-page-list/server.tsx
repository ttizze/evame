import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { fetchPaginatedPopularPageLists } from "@/app/[locale]/_db/page-list.server";
import { fetchPaginatedPopularPageListsForTopPage } from "./_db/queries.server";
import { PopularPageListPresentation } from "./presentation";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface PopularPageListProps {
	locale: string;
	searchParams?: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function PopularPageList({
	locale,
	searchParams,
	showPagination = false,
}: PopularPageListProps) {
	const page = searchParams ? (await loadSearchParams(searchParams)).page : 1;

	const { pageForLists, totalPages } = showPagination
		? await fetchPaginatedPopularPageLists({
				page,
				pageSize: 5,
				locale,
			})
		: await fetchPaginatedPopularPageListsForTopPage({
				page,
				pageSize: 5,
				locale,
			});

	return (
		<PopularPageListPresentation
			currentPage={page}
			locale={locale}
			pageForLists={pageForLists}
			showPagination={showPagination}
			totalPages={totalPages}
		/>
	);
}
