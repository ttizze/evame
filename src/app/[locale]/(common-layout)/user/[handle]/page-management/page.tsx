import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth-server";

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

export default async function PageManagementPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<SearchParams>;
}) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return redirect("/auth/login");
	}
	const { locale } = await params;
	const { page, query } = await loadSearchParams(searchParams);

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
