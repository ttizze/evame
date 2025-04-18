import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPagesWithRelations } from "@/app/[locale]/_db/page-queries.server";
import { getCurrentUser } from "@/auth";
import { BookOpenIcon } from "lucide-react";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
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

	const { pageSummaries, totalPages } =
		await fetchPaginatedPublicPagesWithRelations({
			page,
			pageSize: 5,
			isPopular: true,
			locale,
			currentUserId: currentUser?.id,
		});

	return (
		<PageListContainer title="Popular Pages" icon={BookOpenIcon}>
			{pageSummaries.map((pageSummary, index) => (
				<PageList
					key={pageSummary.id}
					pageSummary={pageSummary}
					pageLink={`/user/${pageSummary.user.handle}/page/${pageSummary.slug}`}
					userLink={`/user/${pageSummary.user.handle}`}
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
