import { notFound } from "next/navigation";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { PageList } from "@/app/[locale]/_components/page/page-list.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPageLists } from "@/app/[locale]/_db/page-list-queries.server";
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
	const currentUserHandle = currentUser?.handle;

	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return notFound();
	}

	const { pageForLists, totalPages } = await fetchPaginatedPublicPageLists({
		page: page,
		pageSize: 5,
		pageOwnerId: pageOwner.id,
		isPopular: sort === "popular",
		locale,
		currentUserId: currentUser?.id,
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
						currentUserHandle={currentUserHandle}
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
