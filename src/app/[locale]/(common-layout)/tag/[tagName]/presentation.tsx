import { NewPageListByTagPresentation } from "@/app/[locale]/(common-layout)/_components/page/new-page-list-by-tag/presentation";
import type { PageForList } from "@/app/[locale]/types";

type TagPagesData = {
	pageForLists: PageForList[];
	totalPages: number;
};

export function TagPagesPresentation({
	data,
	locale,
	page,
	tagName,
}: {
	data: TagPagesData;
	locale: string;
	page: number;
	tagName: string;
}) {
	return (
		<div className="flex flex-col gap-8 mb-12">
			<NewPageListByTagPresentation
				currentPage={page}
				locale={locale}
				pageForLists={data.pageForLists}
				showPagination={true}
				tagName={tagName}
				totalPages={data.totalPages}
			/>
		</div>
	);
}
