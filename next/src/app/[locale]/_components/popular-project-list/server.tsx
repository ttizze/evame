import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { FolderOpenIcon } from "lucide-react";
import { ProjectList } from "../project-list";
import { fetchPopularProjectsWithPagination } from "./_db/queries.server";
interface PopularProjectListProps {
	handle: string;
	page: number;
	query: string;
}

export default async function PopularProjectList({
	handle,
	page,
	query,
}: PopularProjectListProps) {
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchPopularProjectsWithPagination(page, 10, query);

	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-2xl font-semibold  mb-4 flex items-center gap-2">
				<FolderOpenIcon className="w-4 h-4" />
				Popular Projects
			</h2>
			<ProjectList projects={projectsWithRelations} isOwner={false} />

			<div className="flex justify-center my-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>
		</div>
	);
}
