import { fetchPaginatedProjectsWithRelations } from "@/app/[locale]/_db/queries.server";
import { ProjectManagementTabClient } from "./client";

interface ProjectManagementTabProps {
	currentUserId: string;
	locale: string;
	page: number;
	query: string;
	handle: string;
}

export async function ProjectManagementTab({
	currentUserId,
	locale,
	page,
	query,
	handle,
}: ProjectManagementTabProps) {
	const { projectsWithRelations, totalPages } =
		await fetchPaginatedProjectsWithRelations({
			page,
			pageSize: 10,
			projectOwnerId: currentUserId,
			locale,
			currentUserId,
		});

	return (
		<ProjectManagementTabClient
			projectsWithRelations={projectsWithRelations}
			totalPages={totalPages}
			currentPage={page}
			handle={handle}
		/>
	);
}
