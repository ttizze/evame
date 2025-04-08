import { fetchUserByHandle } from "@/app/_db/queries.server";
import { getCurrentUser } from "@/auth";
import { FolderOpenIcon } from "lucide-react";
import { fetchUserProjectsWithPagination } from "../../_db/queries.server";
import { UserProjectListClient } from "./client";

interface UserProjectListProps {
	handle: string;
	page: number;
	query: string;
}

export async function UserProjectList({
	handle,
	page,
	query,
}: UserProjectListProps) {
	const user = await fetchUserByHandle(handle);
	if (!user) {
		return null;
	}
	const currentUser = await getCurrentUser();
	const isOwner = currentUser?.handle === handle;
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchUserProjectsWithPagination(user.id, page, 10, query);

	return (
		<div className="flex flex-col gap-4 border rounded-lg pt-4 px-4 mb-4">
			<h2 className="text-lg font-semibold flex items-center gap-2">
				<FolderOpenIcon className="w-4 h-4" />
				Projects
			</h2>
			<UserProjectListClient
				projects={projectsWithRelations}
				totalPages={totalPages}
				currentPage={currentPage}
				isOwner={isOwner}
			/>
		</div>
	);
}
