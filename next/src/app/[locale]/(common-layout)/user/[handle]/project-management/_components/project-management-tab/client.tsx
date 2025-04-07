"use client";

import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { Edit, Plus, Trash2 } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { ProjectList } from "../../../../../../_components/project-list";
import type { ProjectWithRelations } from "../../../project/[id]/_db/queries.server";
import { DeleteProjectDialog } from "@/app/[locale]/_components/delete-project-dialog/client";
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
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

	const handleDeleteClick = (projectId: string) => {
		setProjectToDelete(projectId);
		setDeleteDialogOpen(true);
	};

	const renderActions = (project: ProjectWithRelations) => (
		<div className="flex gap-2">
			<Link href={`/user/${project?.user.handle}/project/${project?.id}/edit`}>
				<Button variant="ghost" size="icon">
					<Edit className="h-4 w-4" />
				</Button>
			</Link>
			<Button
				variant="ghost"
				size="icon"
				className="text-destructive"
				onClick={() => handleDeleteClick(project?.id ?? "")}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);

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

			<DeleteProjectDialog
				projectId={projectToDelete}
				isOpen={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			/>
		</div>
	);
}
