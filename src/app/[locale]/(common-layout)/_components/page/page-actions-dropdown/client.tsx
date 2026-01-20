"use client";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PageStatus } from "@/db/types";
import { Link } from "@/i18n/routing";
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
	const router = useRouter();
	useEffect(() => {
		if (publishState.success) {
			toast.success(publishState.message);
			router.refresh();
		}
	}, [publishState, router]);
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label="More options"
					className={`h-8 w-6 cursor-pointer p-0 ${className}`}
					variant="ghost"
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild className="w-full text-left cursor-pointer">
					<Link className="w-full text-left" href={editPath}>
						Edit
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem className="w-full text-left cursor-pointer">
					<form action={publishAction}>
						<input name="pageId" type="hidden" value={pageId} />
						<button
							className="w-full text-left"
							disabled={isPublishing}
							type="submit"
						>
							{status === "PUBLIC" ? "Make Private" : "Make Public"}
						</button>
					</form>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<button
						className="text-red-500 w-full text-left cursor-pointer"
						onClick={() => {
							setDeleteDialogOpen(true);
						}}
						type="button"
					>
						Delete
					</button>
				</DropdownMenuItem>
			</DropdownMenuContent>
			<DeletePageDialog
				onOpenChange={setDeleteDialogOpen}
				open={deleteDialogOpen}
				pageId={pageId}
			/>
		</DropdownMenu>
	);
}
