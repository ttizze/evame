import { SortTabs } from "@/app/[locale]/_components/sort-tabs";
import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { fetchUserProjectsWithPagination } from "../../_db/queries.server";
import { UserProjectListClient } from "./client";

interface UserProjectListProps {
	handle: string;
	page: number;
	query: string;
	sort?: string;
}

export async function UserProjectList({
	handle,
	page,
	query,
	sort = "popular",
}: UserProjectListProps) {
	const user = await fetchUserByHandle(handle);
	if (!user) {
		return null;
	}
	const currentUser = await getCurrentUser();
	const isOwner = currentUser?.handle === handle;
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchUserProjectsWithPagination(user.id, page, 10, query, sort);

	return (
		<div className="flex flex-col gap-4">
			{page > 1 && <SortTabs defaultSort={sort} />}
			<UserProjectListClient
				projects={projectsWithRelations}
				totalPages={totalPages}
				currentPage={currentPage}
				isOwner={isOwner}
			/>
		</div>
	);
}
