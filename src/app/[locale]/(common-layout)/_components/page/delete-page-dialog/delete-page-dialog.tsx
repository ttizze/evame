"use client";

import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash } from "lucide-react";
import { useActionState, useEffect } from "react";
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
import { type ArchivePageState, archivePageAction } from "./action";

interface DeletePageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pageId: number;
	locale: string;
}

export function DeletePageDialog({
	open,
	onOpenChange,
	pageId,
	locale,
}: DeletePageDialogProps) {
	const router = useRouter();
	const archivePageFn = useServerFn(archivePageAction);
	const [archiveState, archiveAction, isArchiving] = useActionState<
		ArchivePageState,
		FormData
	>(
		async (_previousState, formData) => {
			try {
				return await archivePageFn({
					data: {
						locale,
						pageId: Number(formData.get("pageId")),
					},
				});
			} catch (error) {
				return {
					success: false,
					message:
						error instanceof Error ? error.message : "Failed to delete page",
				};
			}
		},
		{ success: false },
	);

	useEffect(() => {
		if (archiveState.success) {
			toast.success(archiveState.message);
			onOpenChange(false);
			void router.invalidate({ sync: true });
			return;
		}
		if (archiveState.message) {
			toast.error(archiveState.message);
		}
	}, [archiveState, onOpenChange, router]);

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
							<input name="pageId" type="hidden" value={pageId} />
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
