import { SparklesIcon } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger } from "nuqs/server";
import { PageListContainer } from "@/app/[locale]/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedNewPageLists } from "@/app/[locale]/_db/page-list-queries.server";
import { getCurrentUser } from "@/lib/auth-server";
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

	const { pageForLists, totalPages } = await fetchPaginatedNewPageLists({
		page,
		pageSize: 5,
		locale,
	});

	return (
		<PageListContainer icon={SparklesIcon} title="New Pages">
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
