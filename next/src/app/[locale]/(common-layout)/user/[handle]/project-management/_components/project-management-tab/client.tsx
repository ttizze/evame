"use client";

import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectActionsDropdown } from "@/app/[locale]/_components/project/project-actions-dropdown/client";
import type { ProjectWithRelationsForList } from "@/app/[locale]/_db/queries.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { Plus } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";

interface ProjectManagementTabClientProps {
	projectsWithRelations: ProjectWithRelationsForList[];
	totalPages: number;
	currentPage: number;
	handle: string;
}

export function ProjectManagementTabClient({
	projectsWithRelations,
	totalPages,
	currentPage,
	handle,
}: ProjectManagementTabClientProps) {
	const [query, setQuery] = useQueryState(
		"query",
		parseAsString.withOptions({
			shallow: false,
		}),
	);

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<Input
					placeholder="Search pages..."
					value={query || ""}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full"
				/>
				<Link href={`/user/${handle}/project/new`}>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						Create
					</Button>
				</Link>
			</div>

			<div className="rounded-md">
				{projectsWithRelations.map((project) => (
					<div key={project.id} className="flex border-b py-2 justify-between">
						<div>
							<Link href={`/user/${handle}/project/${project.id}`}>
								{project.title}
							</Link>
						</div>
						<ProjectActionsDropdown project={project} />
					</div>
				))}
			</div>

			<div className="flex justify-center mt-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>
		</div>
	);
}
