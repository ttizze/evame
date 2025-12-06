import { BookOpenIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { fetchPaginatedPopularPageLists } from "@/app/[locale]/_db/page-list-queries.server";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import { PageList } from "../page-list.server";
import { PageListContainer } from "../page-list-container/server";

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

	const { pageForLists, totalPages } = await fetchPaginatedPopularPageLists({
		page,
		pageSize: 5,
		locale,
	});

	return (
		<PageListContainer icon={BookOpenIcon} title="Popular Pages">
			{pageForLists.map((PageForList, index) => (
				<PageList
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
