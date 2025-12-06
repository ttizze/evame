import { notFound } from "next/navigation";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import {
	fetchPaginatedNewPageLists,
	fetchPaginatedPopularPageLists,
} from "@/app/[locale]/_db/page-list-queries.server";
import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list.server";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import { getCurrentUser } from "@/lib/auth-server";

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
