import { PageListContainer } from "@/app/[locale]/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPageSummaries } from "@/app/[locale]/_db/page-queries.server";
import { getCurrentUser } from "@/auth";
import { SparklesIcon } from "lucide-react";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { PageList } from "../page-list.server";
const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface NewPageListProps {
	locale: string;
	searchParams: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function NewPageList({
	locale,
	searchParams,
	showPagination = false,
}: NewPageListProps) {
	const { page } = await loadSearchParams(searchParams);
	const currentUser = await getCurrentUser();
	const currentUserHandle = currentUser?.handle;

	const { pageSummaries, totalPages } = await fetchPaginatedPublicPageSummaries(
		{
			page,
			pageSize: 5,
			isPopular: false,
			locale,
			currentUserId: currentUser?.id,
		},
	);

	return (
		<PageListContainer title="New Pages" icon={SparklesIcon}>
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
