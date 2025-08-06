"use server";

import { BookOpenIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { PageList } from "@/app/[locale]/_components/page/page-list.server";
import { PageListContainer } from "@/app/[locale]/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { getCurrentUser } from "@/lib/auth-server";
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
	const currentUser = await getCurrentUser();
	const currentUserHandle = currentUser?.handle;

	const { pageForLists, totalPages } = await fetchPaginatedPublicPageListsByTag(
		{
			tagName,
			page,
			pageSize: 5,
			locale,
		},
	);

	if (pageForLists.length === 0) {
		return null;
	}

	return (
		<PageListContainer icon={BookOpenIcon} title={`Popular Pages – ${tagName}`}>
			{pageForLists.map((PageForList, index) => (
				<PageList
					currentUserHandle={currentUserHandle}
					index={index}
					key={PageForList.id}
					locale={locale}
					PageForList={PageForList}
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
