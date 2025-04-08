"use client";

import { useProjectActions } from "@/app/[locale]/(common-layout)/user/[handle]/_hooks/use-project-actions";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { Plus } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { ProjectList } from "../../../../../../_components/project-list";
import type { ProjectWithRelations } from "../../../project/[id]/_db/queries.server";

interface ProjectManagementTabClientProps {
	projects: ProjectWithRelations[];
	totalPages: number;
	currentPage: number;
	handle: string;
}

export function ProjectManagementTabClient({
	projects,
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

	const { renderActions, DeleteDialog } = useProjectActions();

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<Input
					placeholder="Search projects..."
					value={query || ""}
					onChange={(e) => setQuery(e.target.value)}
					className="max-w-md"
				/>
				<Link href={`/user/${handle}/project/new`}>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						Create
					</Button>
				</Link>
			</div>

			{projects.length === 0 ? (
				<div className="text-center py-12 border rounded-lg bg-muted/20">
					<p className="text-muted-foreground mb-4">No projects found</p>
					<Link href={`/user/${handle}/project/new`}>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Create project
						</Button>
					</Link>
				</div>
			) : (
				<ProjectList projects={projects} renderActions={renderActions} />
			)}

			<div className="flex justify-center mt-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>

			<DeleteDialog />
		</div>
	);
}
