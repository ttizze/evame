"use client";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import type { PageStatus } from "@prisma/client";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
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
					variant="ghost"
					className={`h-8 w-6 p-0 ${className}`}
					aria-label="More options"
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild className="w-full text-left cursor-pointer">
					<Link href={editPath} className="w-full text-left">
						Edit
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem className="w-full text-left cursor-pointer">
					<form action={publishAction}>
						<input type="hidden" name="pageId" value={pageId} />
						<button
							type="submit"
							disabled={isPublishing}
							className="w-full text-left"
						>
							{status === "PUBLIC" ? "Make Private" : "Make Public"}
						</button>
					</form>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<button
						type="button"
						className="text-red-500 w-full text-left"
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
				pageId={pageId}
			/>
		</DropdownMenu>
	);
}
