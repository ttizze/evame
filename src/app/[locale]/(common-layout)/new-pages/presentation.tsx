import { NewPageListPresentation } from "@/app/[locale]/(common-layout)/_components/page/new-page-list/presentation";
import type { PageForList } from "@/app/[locale]/types";

type NewPagesData = {
	pageForLists: PageForList[];
	totalPages: number;
};

export function NewPagesPresentation({
	data,
	locale,
	page,
}: {
	data: NewPagesData;
	locale: string;
	page: number;
}) {
	return (
		<div className="flex flex-col gap-8 mb-12">
			<NewPageListPresentation
				currentPage={page}
				locale={locale}
				pageForLists={data.pageForLists}
				showPagination={true}
				totalPages={data.totalPages}
			/>
		</div>
	);
}
