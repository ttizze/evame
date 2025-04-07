"use client";

import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectList } from "@/app/[locale]/_components/project-list";
import type { ProjectWithRelations } from "@/app/[locale]/(common-layout)/user/[handle]/project/[id]/_db/queries.server";
interface UserProjectListClientProps {
	projects: ProjectWithRelations[];
	totalPages: number;
	currentPage: number;
}

export function UserProjectListClient({
	projects,
	totalPages,
	currentPage,
}: UserProjectListClientProps) {
	return (
		<div className="">
				<ProjectList projects={projects}  />

			<div className="flex justify-center my-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>
		</div>
	);
}
