import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import type { PageForList } from "@/app/[locale]/types";

export function UserPageList({
	isOwner,
	locale,
	page,
	pageForLists,
	totalPages,
}: {
	isOwner: boolean;
	locale: string;
	page: number;
	pageForLists: PageForList[];
	totalPages: number;
}) {
	if (pageForLists.length === 0) {
		return (
			<p className="text-center text-gray-500 mt-10">
				{isOwner ? "You haven't created any pages yet." : "No pages yet."}
			</p>
		);
	}

	return (
		<>
			<PageLikeListClient
				pageIds={pageForLists.map((pageForList) => pageForList.id)}
			/>
			<div>
				{pageForLists.map((pageForList) => (
					<PageList
						key={pageForList.id}
						locale={locale}
						PageForList={pageForList}
						showOwnerActions={isOwner}
					/>
				))}
			</div>
			{totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar currentPage={page} totalPages={totalPages} />
				</div>
			)}
		</>
	);
}
