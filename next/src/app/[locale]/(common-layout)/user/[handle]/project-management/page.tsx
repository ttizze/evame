import { getCurrentUser } from "@/auth";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import type { SearchParams } from "nuqs/server";

const ProjectManagementTab = dynamic(
	() =>
		import("./_components/project-management-tab/server").then(
			(mod) => mod.ProjectManagementTab,
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

interface ProjectManagementPageProps {
	params: Promise<{ handle: string; locale: string }>;
	searchParams: Promise<SearchParams>;
}

export default async function ProjectManagementPage({
	params,
	searchParams,
}: ProjectManagementPageProps) {
	const { handle, locale } = await params;
	const currentUser = await getCurrentUser();
	if (!currentUser?.id || currentUser.handle !== handle) {
		return redirect("/auth/login");
	}
	const { page, query } = await loadSearchParams(searchParams);

	return (
		<div className="mx-auto max-w-4xl py-10">
			<ProjectManagementTab
				currentUserId={currentUser.id}
				page={page}
				query={query}
				locale={locale}
				handle={currentUser.handle}
			/>
		</div>
	);
}
