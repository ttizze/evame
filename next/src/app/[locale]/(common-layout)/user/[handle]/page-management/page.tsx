import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

const PageManagementTab = dynamic(
	() =>
		import("./components/page-management-tab/server").then(
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
export default async function PageManagementPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return redirect("/auth/login");
	}
	const { locale } = await params;
	const { page = "1", query = "" } = await searchParams;
	if (typeof page !== "string" || typeof query !== "string") {
		throw new Error("Invalid page or query");
	}

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
				locale={locale}
				page={page}
				query={query}
				handle={currentUser.handle}
			/>
			{/* </TabsContent> */}
			{/* </Tabs> */}
		</div>
	);
}
