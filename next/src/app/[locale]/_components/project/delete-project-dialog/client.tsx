"use client";

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
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { deleteProjectAction } from "./actions";

interface DeleteProjectDialogClientProps {
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteProjectDialogClient({
	projectId,
	open,
	onOpenChange,
}: DeleteProjectDialogClientProps) {
	const [deleteState, deleteAction, isDeleting] = useActionState<
		ActionResponse,
		FormData
	>(deleteProjectAction, { success: false });
	const router = useRouter();

	useEffect(() => {
		if (deleteState.success) {
			toast.success(deleteState.message);
			onOpenChange(false);
			router.refresh();
		}
	}, [deleteState, onOpenChange, router]);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center">
							<Trash className="w-4 h-4 mr-2" />
							Delete Project
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this project? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>

					{deleteState.message && !deleteState.success && (
						<div className="text-destructive text-sm mt-2">
							{deleteState.message}
						</div>
					)}

					<DialogFooter>
						<div className="flex items-center justify-between gap-2 w-full">
							<Button
								variant="outline"
								className="w-1/2"
								onClick={() => onOpenChange(false)}
								disabled={isDeleting}
							>
								Cancel
							</Button>
							<form action={deleteAction} className="w-1/2">
								<input type="hidden" name="projectId" value={projectId} />
								<Button
									variant="destructive"
									type="submit"
									className="w-full"
									disabled={isDeleting}
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
		</>
	);
}
