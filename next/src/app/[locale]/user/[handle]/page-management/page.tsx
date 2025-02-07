import { auth } from "@/auth";
import { PageManagementTab } from "./components/page-management-tab";
import { fetchPaginatedOwnPages } from "./db/queries.server";

type Props = {
	params: {
		locale: string;
	};
	searchParams: {
		page: string;
		query: string;
	};
};

export default async function PageManagementPage(props: Props) {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		throw new Error("Unauthorized");
	}
	const { params, searchParams } = await props;
	const { locale } = await params;
	const resolvedSearchParams = await searchParams;
	const page = Number(resolvedSearchParams.page || "1");
	const query = resolvedSearchParams.query || "";
	const { pagesWithTitle, totalPages, currentPage } =
		await fetchPaginatedOwnPages(currentUser.id, locale, page, 10, query);

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
				pagesWithTitle={pagesWithTitle}
				totalPages={totalPages}
				currentPage={currentPage}
				handle={currentUser.handle}
			/>
			{/* </TabsContent> */}

			{/* <TabsContent value="folder-upload">
					{hasGeminiApiKey ? (
						<FolderUploadTab />
					) : (
						<div className="p-4 text-center text-red-500">
							Gemini API key is not set
						</div>
					)}
				</TabsContent>

				<TabsContent value="github-integration">
					<GitHubIntegrationTab />
				</TabsContent> */}
			{/* </Tabs> */}
		</div>
	);
}
