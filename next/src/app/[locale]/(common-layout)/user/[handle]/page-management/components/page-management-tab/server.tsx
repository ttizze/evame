import { getGeoViewData } from "../../components/page-view-data/view-data";
import { fetchPaginatedOwnPages } from "../../db/queries.server";
import { PageManagementTabClient } from "./client";

interface PageManagementTabProps {
	currentUserId: string;
	locale: string;
	page: string;
	query: string;
	handle: string;
}

export async function PageManagementTab({
	currentUserId,
	locale,
	page,
	query,
	handle,
}: PageManagementTabProps) {
	const { pagesWithTitle, totalPages, currentPage } =
		await fetchPaginatedOwnPages(
			currentUserId,
			locale,
			Number(page),
			10,
			query,
		);
	const pagesWithTitleAndViewData = await Promise.all(
		pagesWithTitle.map(async (pageData) => {
			const path = `/user/${handle}/page/${pageData.slug}`;
			try {
				const geoViewData = await getGeoViewData(path);
				const totalViews = geoViewData.reduce(
					(sum, item) => sum + item.views,
					0,
				);

				return {
					...pageData,
					viewCount: totalViews,
					geoViewData,
				};
			} catch (error) {
				console.error(`Failed to fetch view data for ${path}:`, error);
				return {
					...pageData,
					viewCount: 0,
					geoViewData: [],
				};
			}
		}),
	);

	return (
		<PageManagementTabClient
			pagesWithTitleAndViewData={pagesWithTitleAndViewData}
			totalPages={totalPages}
			currentPage={currentPage}
			handle={handle}
		/>
	);
}
