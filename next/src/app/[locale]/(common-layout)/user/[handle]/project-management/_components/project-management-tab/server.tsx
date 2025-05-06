import { fetchPaginatedOwnProjects } from "@/app/[locale]/(common-layout)/user/[handle]/project-management/_db/queries.server";
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
	const { projects, totalPages } = await fetchPaginatedOwnProjects(
		currentUserId,
		locale,
		page,
		10,
		query,
	);

	return (
		<ProjectManagementTabClient
			projects={projects}
			totalPages={totalPages}
			currentPage={page}
			handle={handle}
		/>
	);
}
