"use server";

import { PageListContainer } from "@/app/[locale]/_components/page/page-list-container/server";
import { PageList } from "@/app/[locale]/_components/page/page-list.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { getCurrentUser } from "@/auth";
import { BookOpenIcon } from "lucide-react";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { fetchPaginatedPublicPageSummariesByTag } from "./_db/queries.server";

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

	const { pageSummaries, totalPages } =
		await fetchPaginatedPublicPageSummariesByTag({
			tagName,
			page,
			pageSize: 5,
			locale,
			currentUserId: currentUser?.id,
		});

	if (pageSummaries.length === 0) {
		return null;
	}

	return (
		<PageListContainer title={`Popular Pages – ${tagName}`} icon={BookOpenIcon}>
			{pageSummaries.map((pageSummary, index) => (
				<PageList
					key={pageSummary.id}
					pageSummary={pageSummary}
					index={index}
					locale={locale}
					currentUserHandle={currentUserHandle}
				/>
			))}
			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar totalPages={totalPages} currentPage={page} />
				</div>
			)}
		</PageListContainer>
	);
}
