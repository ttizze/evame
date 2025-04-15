import { PageListContainer } from "@/app/[locale]/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/_db/queries.server";
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

	const { pagesWithRelations, totalPages } =
		await fetchPaginatedPublicPagesWithInfo({
			page,
			pageSize: 5,
			isPopular: false,
			locale,
		});

	return (
		<PageListContainer title="New Pages" icon={SparklesIcon}>
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
