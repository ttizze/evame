import { PageList } from "@/app/[locale]/_components/page-list";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/_db/queries.server";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { getGuestId } from "@/lib/get-guest-id";
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
	const guestId = !currentUser ? await getGuestId() : undefined;
	const isOwner = currentUser?.handle === handle;

	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return notFound();
	}

	const { pagesWithRelations, totalPages } =
		await fetchPaginatedPublicPagesWithInfo({
			page: page,
			pageSize: 5,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			pageOwnerId: pageOwner.id,
			isPopular: sort === "popular",
			onlyUserOwn: true,
			locale,
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
