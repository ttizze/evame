import { Trash } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";

interface DeletePageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function DeletePageDialog({
	open,
	onOpenChange,
	onConfirm,
}: DeletePageDialogProps) {
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
					<Button variant="destructive" onClick={onConfirm}>
						<Trash className="w-4 h-4 mr-2" />
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
