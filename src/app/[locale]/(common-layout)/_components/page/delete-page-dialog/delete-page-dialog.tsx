import { Loader2, Trash } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { ArchivePageState } from "./action";

interface DeletePageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	archive: () => Promise<ArchivePageState>;
	onDeleted: () => void;
}

export function DeletePageDialog({
	open,
	onOpenChange,
	archive,
	onDeleted,
}: DeletePageDialogProps) {
	const [isArchiving, startArchiving] = useTransition();
	const archiveAction = async () => {
		startArchiving(async () => {
			try {
				const result = await archive();
				if (result.success) {
					toast.success(result.message);
					onOpenChange(false);
					onDeleted();
				} else if (result.message) toast.error(result.message);
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to delete page",
				);
			}
		});
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center">
						<Trash className="mr-2 h-4 w-4" />
						Delete Page
					</DialogTitle>
					<DialogDescription>
						This action cannot be undone. Are you sure you want to delete this
						page?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<div className="flex w-full items-center justify-between gap-2">
						<Button
							className="w-1/2"
							onClick={() => onOpenChange(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<form action={archiveAction} className="w-1/2">
							<Button
								className="w-full"
								disabled={isArchiving}
								type="submit"
								variant="destructive"
							>
								{isArchiving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Trash className="mr-2 h-4 w-4" />
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
