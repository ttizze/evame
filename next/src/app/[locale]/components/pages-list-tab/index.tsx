import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/db/queries.server";
import type { PageCardLocalizedType } from "@/app/[locale]/db/queries.server";
import { getGuestId } from "@/lib/get-guest-id";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { PagesListTabClient } from "./client";
const searchParamsSchema = {
	activeTab: parseAsString.withDefault("recommended"),
	recommendedPage: parseAsInteger.withDefault(1),
	newPage: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface PageListTabProps {
	locale: string;
	currentUserId: string;
	searchParams: Promise<SearchParams>;
}

export default async function PageListTab({
	locale,
	currentUserId,
	searchParams,
}: PageListTabProps) {
	const { activeTab, recommendedPage, newPage } =
		await loadSearchParams(searchParams);
	const guestId = await getGuestId();

	let pagesWithInfo: PageCardLocalizedType[] = [];
	let totalPages = 0;
	let currentPage = 1;
	if (activeTab === "recommended") {
		const result = await fetchPaginatedPublicPagesWithInfo({
			page: Number(recommendedPage),
			pageSize: 9,
			currentUserId: currentUserId,
			currentGuestId: guestId,
			isRecommended: true,
			locale,
		});
		pagesWithInfo = result.pagesWithInfo;
		totalPages = result.totalPages;
		currentPage = result.currentPage;
	} else {
		const result = await fetchPaginatedPublicPagesWithInfo({
			page: Number(newPage),
			pageSize: 9,
			currentUserId: currentUserId,
			currentGuestId: guestId,
			locale,
		});
		pagesWithInfo = result.pagesWithInfo;
		totalPages = result.totalPages;
		currentPage = result.currentPage;
	}
	return (
		<PagesListTabClient
			initialTab={activeTab}
			pagesWithInfo={pagesWithInfo}
			totalPages={totalPages}
			currentPage={currentPage}
			locale={locale}
		/>
	);
}
