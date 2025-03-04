import { PageCard } from "@/app/[locale]/_components/page-card";
import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/_db/queries.server";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { getGuestId } from "@/lib/get-guest-id";
import { notFound } from "next/navigation";
import { PaginationControls } from "./pagination-controls";
interface PageListServerProps {
	handle: string;
	page: number;
	locale: string;
}

export async function PageListServer({
	handle,
	page,
	locale,
}: PageListServerProps) {
	const currentUser = await getCurrentUser();
	const guestId = !currentUser ? await getGuestId() : undefined;
	const isOwner = currentUser?.handle === handle;

	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return notFound();
	}
	const { pagesWithInfo, totalPages, currentPage } =
		await fetchPaginatedPublicPagesWithInfo({
			page: page,
			pageSize: 9,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			pageOwnerId: pageOwner.id,
			onlyUserOwn: true,
			locale,
		});

	if (pagesWithInfo.length === 0) {
		return (
			<p className="text-center text-gray-500 mt-10">
				{isOwner ? "You haven't created any pages yet." : "No pages yet."}
			</p>
		);
	}

	return (
		<>
			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{pagesWithInfo.map((pageWithInfo) => (
					<PageCard
						key={pageWithInfo.id}
						pageCard={pageWithInfo}
						pageLink={`/user/${handle}/page/${pageWithInfo.slug}`}
						userLink={`/user/${handle}`}
						showOwnerActions={isOwner}
					/>
				))}
			</div>

			<div className="mt-8 flex justify-center">
				<PaginationControls currentPage={currentPage} totalPages={totalPages} />
			</div>
		</>
	);
}
