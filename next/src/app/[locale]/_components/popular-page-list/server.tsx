import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/_db/queries.server";
import { getGuestId } from "@/lib/get-guest-id";
import { BookOpenIcon } from "lucide-react";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { PopularPageListClient } from "./client";
const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface PopularPageListProps {
	locale: string;
	currentUserId: string;
	searchParams: Promise<SearchParams>;
}

export default async function PopularPageList({
	locale,
	currentUserId,
	searchParams,
}: PopularPageListProps) {
	const { page } = await loadSearchParams(searchParams);
	const guestId = await getGuestId();

	const result = await fetchPaginatedPublicPagesWithInfo({
		page,
		pageSize: 5,
		currentUserId: currentUserId,
		currentGuestId: guestId,
		isRecommended: true,
		locale,
	});

	const pagesWithRelations = result.pagesWithRelations;
	const totalPages = result.totalPages;

	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
				<BookOpenIcon className="w-4 h-4" />
				Popular Pages
			</h2>
			<PopularPageListClient
				pagesWithRelations={pagesWithRelations}
				totalPages={totalPages}
				locale={locale}
			/>
		</div>
	);
}
