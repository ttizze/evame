"use client";
import type { ProjectWithRelations } from "@/app/[locale]/(common-layout)/user/[handle]/project/[id]/_db/queries.server";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { Edit, MoreVertical, TrashIcon } from "lucide-react";
import { useState } from "react";
import { DeleteProjectDialogClient } from "../delete-project-dialog/client";

interface ProjectActionsDropdownProps {
	project: ProjectWithRelations;
	className?: string;
}

export function ProjectActionsDropdown({
	project,
	className = "",
}: ProjectActionsDropdownProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className={`h-8 w-6 p-0 ${className}`}
					aria-label="More options"
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild className="w-full text-left cursor-pointer">
					<Link
						href={`/user/${project?.user.handle}/project/${project?.id}/edit`}
						className="w-full text-left"
					>
						<Edit className="h-4 w-4 mr-2" />
						Edit
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<button
						type="button"
						className="text-red-500 w-full text-left flex items-center"
						onClick={() => {
							setDeleteDialogOpen(true);
						}}
					>
						<TrashIcon className="h-4 w-4 mr-2" />
						Delete
					</button>
				</DropdownMenuItem>
			</DropdownMenuContent>
			<DeleteProjectDialogClient
				projectId={project?.id ?? ""}
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			/>
		</DropdownMenu>
	);
}
