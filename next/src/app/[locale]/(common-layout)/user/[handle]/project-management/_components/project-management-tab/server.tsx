import { fetchProjectsWithPagination } from "../../../_db/queries.server";
import { ProjectManagementTabClient } from "./client";

interface ProjectManagementTabProps {
	currentUserId: string;
	page: number;
	query: string;
	handle: string;
}

export async function ProjectManagementTab({
	currentUserId,
	page,
	query,
	handle,
}: ProjectManagementTabProps) {
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchProjectsWithPagination(currentUserId, page, 10, query);

	return (
		<ProjectManagementTabClient
			projects={projectsWithRelations}
			totalPages={totalPages}
			currentPage={currentPage}
			handle={handle}
		/>
	);
}
