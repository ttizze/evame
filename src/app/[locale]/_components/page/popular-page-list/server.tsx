import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPageSummaries } from "@/app/[locale]/_db/page-queries.server";
import { getCurrentUser } from "@/lib/auth-server";
import { BookOpenIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { PageListContainer } from "../page-list-container/server";
import { PageList } from "../page-list.server";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface PopularPageListProps {
	locale: string;
	searchParams: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function PopularPageList({
	locale,
	searchParams,
	showPagination = false,
}: PopularPageListProps) {
	const { page } = await loadSearchParams(searchParams);
	const currentUser = await getCurrentUser();
	const currentUserHandle = currentUser?.handle;

	const { pageSummaries, totalPages } = await fetchPaginatedPublicPageSummaries(
		{
			page,
			pageSize: 5,
			isPopular: true,
			locale,
			currentUserId: currentUser?.id,
		},
	);

	return (
		<PageListContainer icon={BookOpenIcon} title="Popular Pages">
			{pageSummaries.map((PageForList, index) => (
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
