import type { ActionState } from "@/app/types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Trash } from "lucide-react";
import { useActionState } from "react";
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
		ActionState,
		FormData
	>(archivePageAction, { success: false });

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
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<form action={archiveAction}>
						<input type="hidden" name="pageIds" value={pageIds.join(",")} />
						<Button
							variant="destructive"
							type="submit"
							disabled={isArchiving}
							onClick={() => onOpenChange(false)}
						>
							<Trash className="w-4 h-4 mr-2" />
							Delete
						</Button>
					</form>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
