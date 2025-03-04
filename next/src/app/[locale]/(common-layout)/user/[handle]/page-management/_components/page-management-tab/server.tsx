import dynamic from "next/dynamic";
import { fetchPaginatedOwnPages } from "../../_db/queries.server";
import { PageManagementTabClient } from "./client";

const DynamicPageViewCounter = dynamic(
	() =>
		import("../page-view-data/view-data").then((mod) => mod.PageViewCounter),
	{
		loading: () => <span>Loading...</span>,
	},
);
interface PageManagementTabProps {
	currentUserId: string;
	locale: string;
	page: number;
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
		await fetchPaginatedOwnPages(currentUserId, locale, page, 10, query);
	const pageViewCounters = pagesWithTitle.reduce(
		(acc, pageData) => {
			const path = `/user/${handle}/page/${pageData.slug}`;
			acc[pageData.id] = (
				<DynamicPageViewCounter key={pageData.id} path={path} />
			);
			return acc;
		},
		{} as Record<string, React.ReactNode>,
	);
	return (
		<PageManagementTabClient
			pagesWithTitle={pagesWithTitle}
			totalPages={totalPages}
			currentPage={currentPage}
			handle={handle}
			pageViewCounters={pageViewCounters}
		/>
	);
}
