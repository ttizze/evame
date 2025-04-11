import { FolderOpenIcon } from "lucide-react";
import { ProjectListContainer } from "../project-list-container/server";
import { fetchPopularProjectsWithPagination } from "./_db/queries.server";

interface PopularProjectListProps {
	handle: string;
	page: number;
	query: string;
	showPagination?: boolean;
}

export default async function PopularProjectList({
	handle,
	page,
	query,
	showPagination = false,
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
