import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectList } from "@/app/[locale]/_components/project/project-list.server";
import { fetchPaginatedProjectSummaries } from "@/app/[locale]/_db/project-queries.server";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { notFound } from "next/navigation";
interface UserProjectListProps {
	handle: string;
	page: number;
	locale: string;
	sort?: string;
	showPagination?: boolean;
}

export async function UserProjectList({
	handle,
	page,
	locale,
	sort = "popular",
	showPagination = false,
}: UserProjectListProps) {
	const user = await fetchUserByHandle(handle);
	if (!user) {
		return null;
	}
	const currentUser = await getCurrentUser();
	const isOwner = currentUser?.handle === handle;
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return notFound();
	}
	const { projectSummaries, totalPages } = await fetchPaginatedProjectSummaries(
		{
			page: page,
			pageSize: 10,
			projectOwnerId: pageOwner.id,
			locale,
			currentUserId: currentUser?.id,
		},
	);
	if (projectSummaries.length === 0) {
		return (
			<p className="text-center text-gray-500 mt-10">
				{isOwner ? "You haven't created any projects yet." : "No projects yet."}
			</p>
		);
	}
	return (
		<>
			<div className="">
				{projectSummaries.map((projectSummary) => (
					<ProjectList
						key={projectSummary.id}
						projectSummary={projectSummary}
						projectLink={`/user/${handle}/project/${projectSummary.slug}`}
						userLink={`/user/${handle}`}
						showOwnerActions={isOwner}
					/>
				))}
			</div>

			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar totalPages={totalPages} currentPage={page} />
				</div>
			)}
		</>
	);
}
