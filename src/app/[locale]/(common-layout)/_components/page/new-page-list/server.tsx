import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { fetchPaginatedNewPageLists } from "@/app/[locale]/_db/page-list.server";
import { fetchPaginatedNewPageListsForTopPage } from "./_db/queries.server";
import { NewPageListPresentation } from "./presentation";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface NewPageListProps {
	locale: string;
	searchParams?: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function NewPageList({
	locale,
	searchParams,
	showPagination = false,
}: NewPageListProps) {
	const page = searchParams ? (await loadSearchParams(searchParams)).page : 1;

	const { pageForLists, totalPages } = showPagination
		? await fetchPaginatedNewPageLists({
				page,
				pageSize: 5,
				locale,
			})
		: await fetchPaginatedNewPageListsForTopPage({
				page,
				pageSize: 5,
				locale,
			});

	return (
		<NewPageListPresentation
			currentPage={page}
			locale={locale}
			pageForLists={pageForLists}
			showPagination={showPagination}
			totalPages={totalPages}
		/>
	);
}
