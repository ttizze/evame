import { SparklesIcon } from "lucide-react";
import { ProjectListContainer } from "../project-list-container/server";
import { fetchNewProjectsWithPagination } from "./_db/queries.server";

interface NewProjectListProps {
	handle: string;
	page: number;
	query: string;
}

export default async function NewProjectList({
	handle,
	page,
	query,
}: NewProjectListProps) {
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchNewProjectsWithPagination(page, 10, query);

	return (
		<ProjectListContainer
			title="New Projects"
			icon={SparklesIcon}
			projects={projectsWithRelations}
			totalPages={totalPages}
			currentPage={currentPage}
			isOwner={false}
		/>
	);
}
