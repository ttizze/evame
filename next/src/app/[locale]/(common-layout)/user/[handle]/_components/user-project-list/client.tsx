import type { ProjectWithRelations } from "@/app/[locale]/(common-layout)/user/[handle]/project/[id]/_db/queries.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectList } from "@/app/[locale]/_components/project/project-list";

interface UserProjectListClientProps {
	projects: ProjectWithRelations[];
	totalPages: number;
	currentPage: number;
	isOwner: boolean;
}

export function UserProjectListClient({
	projects,
	totalPages,
	currentPage,
	isOwner,
}: UserProjectListClientProps) {
	return (
		<div className="">
			<ProjectList projects={projects} isOwner={isOwner} />

			<div className="flex justify-center my-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>
		</div>
	);
}
