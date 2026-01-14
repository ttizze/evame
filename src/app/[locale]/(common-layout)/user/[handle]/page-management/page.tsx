import type { Route } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { getCurrentUser } from "@/app/_service/auth-server";
import { Skeleton } from "@/components/ui/skeleton";

const PageManagementTab = dynamic(
	() =>
		import("./_components/page-management-tab/server").then(
			(mod) => mod.PageManagementTab,
		),
	{
		loading: () => (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
				<Skeleton className="h-[100px] w-full" />
			</div>
		),
	},
);

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
	query: parseAsString.withDefault(""),
};
const loadSearchParams = createLoader(searchParamsSchema);

export default async function PageManagementPage(
	props: PageProps<"/[locale]/user/[handle]/page-management">,
): Promise<React.ReactNode> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login" as Route);
	}
	const { locale } = await props.params;
	const { page, query } = await loadSearchParams(props.searchParams);

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
				currentUserId={currentUser.id}
				handle={currentUser.handle}
				locale={locale}
				page={page}
				query={query}
			/>
			{/* </TabsContent> */}
			{/* </Tabs> */}
		</div>
	);
}
