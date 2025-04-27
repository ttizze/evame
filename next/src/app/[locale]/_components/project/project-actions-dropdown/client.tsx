"use client";
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
	projectSlug: string;
	projectId: number;
	projectOwnerHandle: string;
	className?: string;
}

export function ProjectActionsDropdown({
	projectSlug,
	projectId,
	projectOwnerHandle,
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
						href={`/user/${projectOwnerHandle}/project/${projectSlug}/edit`}
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
				projectId={projectId}
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			/>
		</DropdownMenu>
	);
}
