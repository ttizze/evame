"use client";
import { NavigationLink } from "@/components/navigation-link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PageStatus } from "@prisma/client";
import { MoreVertical } from "lucide-react";
import { useActionState } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DeletePageDialog } from "../delete-page-dialog/delete-page-dialog";
import { type TogglePublishState, togglePublishAction } from "./action";
interface PageActionsDropdownProps {
	editPath: string;
	pageId: number;
	status: PageStatus;
	className?: string;
}

export function PageActionsDropdown({
	editPath,
	pageId,
	status,
	className = "",
}: PageActionsDropdownProps) {
	const [publishState, publishAction, isPublishing] = useActionState<
		TogglePublishState,
		FormData
	>(togglePublishAction, { success: false });
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	useEffect(() => {
		if (publishState.success) {
			toast.success(publishState.message);
		}
	}, [publishState.success, publishState.message]);
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
				<DropdownMenuItem asChild>
					<NavigationLink href={editPath}>Edit</NavigationLink>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<form action={publishAction}>
						<input type="hidden" name="pageId" value={pageId} />
						<button type="submit" disabled={isPublishing}>
							{status === "PUBLIC" ? "Make Private" : "Make Public"}
						</button>
					</form>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<button
						type="button"
						onClick={() => {
							setDeleteDialogOpen(true);
						}}
					>
						Delete
					</button>
				</DropdownMenuItem>
			</DropdownMenuContent>
			<DeletePageDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				pageIds={[pageId]}
			/>
		</DropdownMenu>
	);
}
