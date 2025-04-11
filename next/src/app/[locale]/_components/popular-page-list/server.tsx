import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/_db/queries.server";
import { getGuestId } from "@/lib/get-guest-id";
import { BookOpenIcon } from "lucide-react";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { PageListContainer } from "../page-list-container/server";
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
		isPopular: true,
		locale,
	});

	const pagesWithRelations = result.pagesWithRelations;
	const totalPages = result.totalPages;

	return (
		<PageListContainer title="Popular Pages" icon={BookOpenIcon}>
			<PopularPageListClient
				pagesWithRelations={pagesWithRelations}
				totalPages={totalPages}
			/>
		</PageListContainer>
	);
}
