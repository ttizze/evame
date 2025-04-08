import { fetchUserProjectsWithPagination } from "@/app/[locale]/(common-layout)/user/[handle]/_db/queries.server";
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
		await fetchUserProjectsWithPagination(currentUserId, page, 10, query);

	return (
		<ProjectManagementTabClient
			projects={projectsWithRelations}
			totalPages={totalPages}
			currentPage={currentPage}
			handle={handle}
		/>
	);
}
