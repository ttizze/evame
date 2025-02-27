import { auth } from "@/auth";
import { PageManagementTab } from "./components/page-management-tab";
import { getGeoViewData } from "./components/page-view-data/view-data";
import { fetchPaginatedOwnPages } from "./db/queries.server";
export default async function PageManagementPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		throw new Error("Unauthorized");
	}
	const { locale } = await params;
	const { page = "1", query = "" } = await searchParams;
	if (typeof page !== "string" || typeof query !== "string") {
		throw new Error("Invalid page or query");
	}
	const { pagesWithTitle, totalPages, currentPage } =
		await fetchPaginatedOwnPages(
			currentUser.id,
			locale,
			Number(page),
			10,
			query,
		);
	const pagesWithTitleAndViewData = await Promise.all(
		pagesWithTitle.map(async (pageData) => {
			const path = `/user/${currentUser.handle}/page/${pageData.slug}`;
			const geoViewData = await getGeoViewData(path);
			const totalViews = geoViewData.reduce((sum, item) => sum + item.views, 0);

			return {
				...pageData,
				viewCount: totalViews,
				geoViewData,
			};
		}),
	);

	return (
		<div className="mx-auto max-w-4xl py-10">
			{/* <Tabs defaultValue="page-management" className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="page-management">Management</TabsTrigger>
					<TabsTrigger value="folder-upload">Folder</TabsTrigger>
					<TabsTrigger value="github-integration">GitHub</TabsTrigger>
				</TabsList> */}

			{/* <TabsContent value="page-management"> */}
			<PageManagementTab
				pagesWithTitleAndViewData={pagesWithTitleAndViewData}
				totalPages={totalPages}
				currentPage={currentPage}
				handle={currentUser.handle}
			/>
			{/* </TabsContent> */}
			{/* </Tabs> */}
		</div>
	);
}
