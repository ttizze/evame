import { NewPageListClient } from "@/app/[locale]/_components/page/new-page-list/client";
import { PageListContainer } from "@/app/[locale]/_components/page/page-list-container/server";
import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/_db/queries.server";
import { getGuestId } from "@/lib/get-guest-id";
import { SparklesIcon } from "lucide-react";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface NewPageListProps {
	locale: string;
	currentUserId: string;
	searchParams: Promise<SearchParams>;
}

export default async function NewPageList({
	locale,
	currentUserId,
	searchParams,
}: NewPageListProps) {
	const { page } = await loadSearchParams(searchParams);
	const guestId = await getGuestId();

	const result = await fetchPaginatedPublicPagesWithInfo({
		page,
		pageSize: 5,
		currentUserId: currentUserId,
		currentGuestId: guestId,
		isPopular: false,
		locale,
	});

	const pagesWithRelations = result.pagesWithRelations;
	const totalPages = result.totalPages;

	return (
		<PageListContainer title="New Pages" icon={SparklesIcon}>
			<NewPageListClient
				pagesWithRelations={pagesWithRelations}
				totalPages={totalPages}
				locale={locale}
			/>
		</PageListContainer>
	);
}
