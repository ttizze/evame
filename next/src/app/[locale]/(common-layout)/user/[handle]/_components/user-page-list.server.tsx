import { PageList } from "@/app/[locale]/_components/page/page-list.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPagesWithRelations } from "@/app/[locale]/_db/queries.server";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { notFound } from "next/navigation";

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

	const { pagesWithRelations, totalPages } =
		await fetchPaginatedPublicPagesWithRelations({
			page: page,
			pageSize: 5,
			pageOwnerId: pageOwner.id,
			isPopular: sort === "popular",
			onlyUserOwn: true,
			locale,
			currentUserId: currentUser?.id,
		});

	if (pagesWithRelations.length === 0) {
		return (
			<p className="text-center text-gray-500 mt-10">
				{isOwner ? "You haven't created any pages yet." : "No pages yet."}
			</p>
		);
	}

	return (
		<>
			<div className="">
				{pagesWithRelations.map((pageWithRelations) => (
					<PageList
						key={pageWithRelations.id}
						pageWithRelations={pageWithRelations}
						pageLink={`/user/${handle}/page/${pageWithRelations.slug}`}
						userLink={`/user/${handle}`}
						showOwnerActions={isOwner}
						locale={locale}
						currentUserHandle={currentUserHandle}
					/>
				))}
			</div>

			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar totalPages={totalPages} currentPage={page} />
				</div>
			)}
		</>
	);
}
