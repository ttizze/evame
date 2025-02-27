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
import { Loader2, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { archivePageAction } from "./action";
interface DeletePageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pageIds: number[];
}

export function DeletePageDialog({
	open,
	onOpenChange,
	pageIds = [],
}: DeletePageDialogProps) {
	const [archiveState, archiveAction, isArchiving] = useActionState<
		ActionResponse,
		FormData
	>(archivePageAction, { success: false });
	const router = useRouter();
	useEffect(() => {
		if (archiveState.success) {
			toast.success(archiveState.message);
			onOpenChange(false);
			router.refresh();
		}
	}, [archiveState, onOpenChange, router]);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
							variant="outline"
							className="w-1/2"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<form action={archiveAction} className="w-1/2">
							<input type="hidden" name="pageIds" value={pageIds.join(",")} />
							<Button
								variant="destructive"
								type="submit"
								className="w-full"
								disabled={isArchiving}
							>
								{isArchiving ? (
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
