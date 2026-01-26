import { notFound } from "next/navigation";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/app/_service/auth-server";
import {
	fetchPaginatedNewPageLists,
	fetchPaginatedPopularPageLists,
} from "@/app/[locale]/_db/page-list.server";
import { PageLikeListClient } from "@/app/[locale]/(common-layout)/_components/page/page-like-button/like-list.client";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list.server";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";

interface PageListServerProps {
	handle: string;
	page: number;
	locale: string;
	sort?: string;
	showPagination?: boolean;
}

export async function PageListServer({
	handle,
	page,
	locale,
	sort = "popular",
	showPagination = false,
}: PageListServerProps) {
	const currentUser = await getCurrentUser();
	const isOwner = currentUser?.handle === handle;

	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return notFound();
	}

	// sort パラメータに基づいて適切な関数を呼び分け
	const fetchFunction =
		sort === "popular"
			? fetchPaginatedPopularPageLists
			: fetchPaginatedNewPageLists;

	const { pageForLists, totalPages } = await fetchFunction({
		page: page,
		pageSize: 5,
		pageOwnerId: pageOwner.id,
		locale,
	});
	if (pageForLists.length === 0) {
		return (
			<p className="text-center text-gray-500 mt-10">
				{isOwner ? "You haven't created any pages yet." : "No pages yet."}
			</p>
		);
	}

	return (
		<>
			<PageLikeListClient pageIds={pageForLists.map((p) => p.id)} />
			<div className="">
				{pageForLists.map((PageForList) => (
					<PageList
						key={PageForList.id}
						locale={locale}
						PageForList={PageForList}
						showOwnerActions={isOwner}
					/>
				))}
			</div>

			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar currentPage={page} totalPages={totalPages} />
				</div>
			)}
		</>
	);
}
