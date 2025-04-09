import { FolderOpenIcon } from "lucide-react";
import { fetchPopularProjectsWithPagination } from "./_db/queries.server";
import { PopularProjectListClient } from "./client";

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
			<h2 className="text-xl font-semibold text-center mb-4 flex items-center justify-center gap-2">
				<FolderOpenIcon className="w-4 h-4" />
				Popular Projects 🔥
			</h2>
			<PopularProjectListClient
				projects={projectsWithRelations}
				totalPages={totalPages}
				currentPage={currentPage}
			/>
		</div>
	);
}
