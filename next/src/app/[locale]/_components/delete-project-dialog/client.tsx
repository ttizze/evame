"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { deleteProjectAction } from "./actions";

interface DeleteProjectDialogProps {
	projectId: string | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeleteProjectDialog({
	projectId,
	isOpen,
	onOpenChange,
}: DeleteProjectDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDelete = async () => {
		if (!projectId) return;

		setIsDeleting(true);
		setError(null);

		try {
			const result = await deleteProjectAction(projectId);

			if (result.success) {
				onOpenChange(false);
			} else {
				setError(result.message || "Failed to delete project");
			}
		} catch (error) {
			console.error("Error deleting project:", error);
			setError("An unexpected error occurred");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Project</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this project? This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>

				{error && <div className="text-destructive text-sm mt-2">{error}</div>}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isDeleting}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={isDeleting}
					>
						{isDeleting ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
