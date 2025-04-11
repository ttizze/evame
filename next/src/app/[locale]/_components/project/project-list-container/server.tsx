import type { ProjectWithRelations } from "@/app/[locale]/(common-layout)/user/[handle]/project/[id]/_db/queries.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import type { LucideIcon } from "lucide-react";
import { ProjectList } from "../project-list";

interface ProjectListContainerProps {
	title: string;
	icon: LucideIcon;
	projects: ProjectWithRelations[];
	totalPages: number;
	currentPage: number;
	isOwner?: boolean;
	showPagination?: boolean;
}

export function ProjectListContainer({
	title,
	icon: Icon,
	projects,
	totalPages,
	currentPage,
	isOwner = false,
	showPagination = false,
}: ProjectListContainerProps) {
	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
				<Icon className="w-4 h-4" />
				{title}
			</h2>
			<ProjectList projects={projects} isOwner={isOwner} />

			{showPagination && (
				<div className="flex justify-center my-4">
					<PaginationBar totalPages={totalPages} currentPage={currentPage} />
				</div>
			)}
		</div>
	);
}
