"use client";

import { useProjectActions } from "@/app/[locale]/(common-layout)/user/[handle]/_hooks/use-project-actions";
import type { ProjectWithRelations } from "@/app/[locale]/(common-layout)/user/[handle]/project/[id]/_db/queries.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectList } from "@/app/[locale]/_components/project-list";

interface PopularProjectListClientProps {
	projects: ProjectWithRelations[];
	totalPages: number;
	currentPage: number;
}

export function PopularProjectListClient({
	projects,
	totalPages,
	currentPage,
}: PopularProjectListClientProps) {
	const { renderActions, DeleteDialog } = useProjectActions({ isOwner: false });

	return (
		<div className="">
			<ProjectList projects={projects} renderActions={renderActions} />

			<div className="flex justify-center my-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>

			<DeleteDialog />
		</div>
	);
}
