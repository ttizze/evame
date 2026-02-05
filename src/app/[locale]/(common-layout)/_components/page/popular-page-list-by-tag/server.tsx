"use server";

import { BookOpenIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { fetchPageViewCounts } from "@/app/[locale]/_db/page-utility-queries.server";
import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list.client";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list.server";
import { PageListContainer } from "@/app/[locale]/(common-layout)/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import { fetchPaginatedPublicPageListsByTag } from "./_db/queries.server";

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
	const viewCounts = await fetchPageViewCounts(pageForLists.map((p) => p.id));

	if (pageForLists.length === 0) {
		return null;
	}

	return (
		<PageListContainer icon={BookOpenIcon} title={`Popular Pages – ${tagName}`}>
			<PageLikeListClient pageIds={pageForLists.map((p) => p.id)} />
			{pageForLists.map((PageForList, index) => (
				<PageList
					index={index}
					key={PageForList.id}
					locale={locale}
					PageForList={PageForList}
					viewCount={viewCounts.get(PageForList.id) ?? 0}
				/>
			))}
			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar currentPage={page} totalPages={totalPages} />
				</div>
			)}
		</PageListContainer>
	);
}
