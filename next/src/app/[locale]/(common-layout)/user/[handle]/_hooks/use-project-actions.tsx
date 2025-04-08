"use client";

import type { ProjectWithRelations } from "@/app/[locale]/(common-layout)/user/[handle]/project/[id]/_db/queries.server";
import { DeleteProjectDialog } from "@/app/[locale]/_components/delete-project-dialog/client";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";

interface UseProjectActionsOptions {
	isOwner?: boolean;
}

export function useProjectActions(options: UseProjectActionsOptions = {}) {
	const { isOwner = false } = options;

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

	const handleDeleteClick = (projectId: string) => {
		setProjectToDelete(projectId);
		setDeleteDialogOpen(true);
	};

	const renderActions = isOwner
		? (project: ProjectWithRelations) => (
				<div className="flex gap-2">
					<Link
						href={`/user/${project?.user.handle}/project/${project?.id}/edit`}
					>
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
			)
		: () => null;

	const DeleteDialog = () => (
		<DeleteProjectDialog
			projectId={projectToDelete}
			isOpen={deleteDialogOpen}
			onOpenChange={setDeleteDialogOpen}
		/>
	);

	return {
		renderActions,
		DeleteDialog,
		handleDeleteClick,
		deleteDialogOpen,
		setDeleteDialogOpen,
		projectToDelete,
		setProjectToDelete,
	};
}
