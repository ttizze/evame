"use server";

import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { fetchPaginatedPublicPageListsByTag } from "./_db/queries";
import { PopularPageListByTagPresentation } from "./presentation";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface PopularPageListByTagProps {
	locale: string;
	tagName: string;
	/**
	 * Forward request searchParams for pagination when needed.
	 * Optional because we may render without pagination.
	 */
	searchParams?: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function PopularPageListByTag({
	locale,
	tagName,
	searchParams,
	showPagination = false,
}: PopularPageListByTagProps) {
	const { page } = searchParams
		? await loadSearchParams(searchParams)
		: { page: 1 };

	const { pageForLists, totalPages } = await fetchPaginatedPublicPageListsByTag(
		{
			tagName,
			page,
			pageSize: 5,
			locale,
		},
	);

	return (
		<PopularPageListByTagPresentation
			currentPage={page}
			locale={locale}
			pageForLists={pageForLists}
			showPagination={showPagination}
			tagName={tagName}
			totalPages={totalPages}
		/>
	);
}
