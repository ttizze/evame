import { BookOpenIcon } from "lucide-react";
import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import type { PageForList } from "@/app/[locale]/types";
import { PageList } from "../page-list";
import { PageListContainer } from "../page-list-container/server";

export function PopularPageListPresentation({
	locale,
	pageForLists,
	currentPage,
	totalPages,
	showPagination,
}: {
	locale: string;
	pageForLists: PageForList[];
	currentPage: number;
	totalPages: number;
	showPagination: boolean;
}) {
	return (
		<PageListContainer icon={BookOpenIcon} title="Popular Pages">
			<PageLikeListClient pageIds={pageForLists.map((item) => item.id)} />
			{pageForLists.map((pageForList, index) => (
				<PageList
					index={index}
					key={pageForList.id}
					locale={locale}
					PageForList={pageForList}
				/>
			))}
			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}
		</PageListContainer>
	);
}
