import { FolderOpenIcon } from "lucide-react";
import { ProjectListContainer } from "../project-list-container/server";
import { fetchPopularProjectsWithPagination } from "./_db/queries.server";

interface PopularProjectListProps {
	page: number;
	query: string;
}

export default async function PopularProjectList({
	page,
	query,
}: PopularProjectListProps) {
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchPopularProjectsWithPagination(page, 10, query);

	return (
		<ProjectListContainer
			title="Popular Projects"
			icon={FolderOpenIcon}
			projects={projectsWithRelations}
			totalPages={totalPages}
			currentPage={currentPage}
			isOwner={false}
		/>
	);
}
