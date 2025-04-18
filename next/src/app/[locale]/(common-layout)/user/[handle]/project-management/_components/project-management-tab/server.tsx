import { fetchPaginatedProjectsWithRelations } from "@/app/[locale]/_db/project-queries.server";
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
	const { projectSummaries, totalPages } =
		await fetchPaginatedProjectsWithRelations({
			page,
			pageSize: 10,
			projectOwnerId: currentUserId,
			locale,
			currentUserId,
		});

	return (
		<ProjectManagementTabClient
			projectSummaries={projectSummaries}
			totalPages={totalPages}
			currentPage={page}
			handle={handle}
		/>
	);
}
