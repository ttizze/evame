import { fetchProjectsWithPagination } from "./_db/queries.server";
import { UserProjectListClient } from "./client";

interface UserProjectListProps {
	currentUserId: string;
	page: number;
	query: string;
}

export async function UserProjectList({
	currentUserId,
	page,
	query,
}: UserProjectListProps) {
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchProjectsWithPagination(currentUserId, page, 10, query);

	return (
		<UserProjectListClient
			projects={projectsWithRelations}
			totalPages={totalPages}
			currentPage={currentPage}     
		/>
	);
}
