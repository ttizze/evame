import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/_db/queries.server";
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

	const result = await fetchPaginatedPublicPagesWithInfo({
		page,
		pageSize: 5,
		isPopular: true,
		locale,
	});

	const pagesWithRelations = result.pagesWithRelations;
	const totalPages = result.totalPages;

	return (
		<PageListContainer title="Popular Pages" icon={BookOpenIcon}>
			{pagesWithRelations.map((pageWithRelations, index) => (
				<PageList
					key={pageWithRelations.id}
					pageWithRelations={pageWithRelations}
					pageLink={`/user/${pageWithRelations.user.handle}/page/${pageWithRelations.slug}`}
					userLink={`/user/${pageWithRelations.user.handle}`}
					index={index}
					locale={locale}
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
