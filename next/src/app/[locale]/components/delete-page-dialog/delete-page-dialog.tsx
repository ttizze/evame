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
import { type ArchivePageState, archivePageAction } from "./action";

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
	const [archiveState, archiveAction, isArchiving] = useActionState<
		ArchivePageState,
		FormData
	>(archivePageAction, {});

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
						<input type="hidden" name="pageId" value={pageId} />
						<Button variant="destructive" type="submit" disabled={isArchiving}>
							<Trash className="w-4 h-4 mr-2" />
							Delete
						</Button>
					</form>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
