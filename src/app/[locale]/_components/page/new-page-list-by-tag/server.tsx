"use server";

import { SparklesIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { PageList } from "@/app/[locale]/_components/page/page-list.server";
import { PageListContainer } from "@/app/[locale]/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { getCurrentUser } from "@/auth";
import { fetchPaginatedPublicNewestPageSummariesByTag } from "./_db/queries.server";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface NewPageListByTagProps {
	locale: string;
	tagName: string;
	/**
	 * Forward request searchParams for pagination when needed.
	 * Optional because we may render without pagination.
	 */
	searchParams?: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function NewPageListByTag({
	locale,
	tagName,
	searchParams,
	showPagination = false,
}: NewPageListByTagProps) {
	const { page } = searchParams
		? await loadSearchParams(searchParams)
		: { page: 1 };
	const currentUser = await getCurrentUser();
	const currentUserHandle = currentUser?.handle;

	const { pageSummaries, totalPages } =
		await fetchPaginatedPublicNewestPageSummariesByTag({
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
		<PageListContainer title={`${tagName}`} icon={SparklesIcon}>
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
