import { SparklesIcon } from "lucide-react";
import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list";
import { PageListContainer } from "@/app/[locale]/(common-layout)/_components/page/page-list-container/server";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import type { PageForList } from "@/app/[locale]/types";

export function NewPageListByTagPresentation({
	locale,
	tagName,
	pageForLists,
	currentPage,
	totalPages,
	showPagination,
}: {
	locale: string;
	tagName: string;
	pageForLists: PageForList[];
	currentPage: number;
	totalPages: number;
	showPagination: boolean;
}) {
	if (pageForLists.length === 0) {
		return null;
	}

	return (
		<PageListContainer icon={SparklesIcon} title={tagName}>
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
