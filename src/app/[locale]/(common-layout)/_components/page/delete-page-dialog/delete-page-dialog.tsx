import { Loader2, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { deletePageAction } from "./action";

interface DeletePageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pageId: number;
}

export function DeletePageDialog({
	open,
	onOpenChange,
	pageId,
}: DeletePageDialogProps) {
	const [deleteState, deleteAction, isDeleting] = useActionState<
		ActionResponse,
		FormData
	>(deletePageAction, { success: false });
	const router = useRouter();
	useEffect(() => {
		if (deleteState.success) {
			toast.success(deleteState.message);
			onOpenChange(false);
			router.refresh();
		}
	}, [deleteState, onOpenChange, router]);
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center">
						<Trash className="w-4 h-4 mr-2" />
						Delete Page
					</DialogTitle>
					<DialogDescription>
						This action cannot be undone. Are you sure you want to delete this
						page?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<div className="flex items-center justify-between gap-2 w-full">
						<Button
							className="w-1/2"
							onClick={() => onOpenChange(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<form action={deleteAction} className="w-1/2">
							<input name="pageId" type="hidden" value={pageId} />
							<Button
								className="w-full"
								disabled={isDeleting}
								type="submit"
								variant="destructive"
							>
								{isDeleting ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Trash className="w-4 h-4 mr-2" />
								)}
								Delete
							</Button>
						</form>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
