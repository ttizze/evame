"use client";

import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TranslationContext } from "../../types";
import { ContextDialog } from "../context-dialog";
import { type DeleteContextActionState, deleteContext } from "./action";

interface ContextListProps {
	initialContexts: TranslationContext[];
	selectedContextId: number | null;
	onContextChange: (contextId: number | null) => void;
}

export function ContextList({
	initialContexts,
	selectedContextId,
	onContextChange,
}: ContextListProps) {
	const [contexts, setContexts] = useState(initialContexts);
	const [editingContext, setEditingContext] =
		useState<TranslationContext | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [deleteState, setDeleteState] = useState<DeleteContextActionState>({
		success: false,
	});
	const [isDeleting, startDeleting] = useTransition();
	const deleteContextFn = useServerFn(deleteContext);

	const handleDelete = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const id = Number(formData.get("id"));
		startDeleting(async () => {
			const result = await deleteContextFn({ data: formData });
			setDeleteState(result);
			if (result.success) {
				setContexts((previous) =>
					previous.filter((context) => context.id !== id),
				);
				if (selectedContextId === id) onContextChange(null);
				toast.success("Context deleted");
			} else if (result.message) {
				toast.error(result.message);
			}
		});
	};

	return (
		<>
			<div className="space-y-2">
				<div className="flex items-center gap-2 text-sm font-medium">
					<MessageSquareText className="w-4 h-4" />
					<span>Translation Context</span>
				</div>
				<div className="space-y-1 max-h-[150px] overflow-y-auto">
					<button
						className={cn(
							"w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer",
							selectedContextId === null && "bg-accent",
						)}
						onClick={() => onContextChange(null)}
						type="button"
					>
						None
					</button>
					{contexts.map((context) => (
						<div
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent group",
								selectedContextId === context.id && "bg-accent",
							)}
							key={context.id}
						>
							<button
								className="flex-1 min-w-0 text-left cursor-pointer"
								onClick={() => onContextChange(context.id)}
								type="button"
							>
								<div className="font-medium text-sm truncate">
									{context.name}
								</div>
								<div className="text-xs text-muted-foreground truncate">
									{context.context}
								</div>
							</button>
							<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									className="p-1 hover:bg-background rounded cursor-pointer"
									onClick={() => {
										setEditingContext(context);
										setIsDialogOpen(true);
									}}
									type="button"
								>
									<Pencil className="size-4" />
								</button>
								<form onSubmit={handleDelete}>
									<input name="id" type="hidden" value={context.id} />
									<button
										className="p-1 hover:bg-background rounded text-destructive cursor-pointer"
										disabled={isDeleting}
										type="submit"
									>
										{isDeleting ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<Trash2 className="size-4" />
										)}
									</button>
								</form>
							</div>
						</div>
					))}
				</div>
				{!deleteState.success && deleteState.message && (
					<p className="text-sm text-red-500">{deleteState.message}</p>
				)}
				<Button
					className="w-full"
					onClick={() => {
						setEditingContext(null);
						setIsDialogOpen(true);
					}}
					size="sm"
					variant="outline"
				>
					<Plus className="size-4 mr-1" />
					New Context
				</Button>
			</div>

			<ContextDialog
				context={editingContext}
				isOpen={isDialogOpen}
				onContextCreated={(context) =>
					setContexts((previous) => [...previous, context])
				}
				onContextUpdated={(context) =>
					setContexts((previous) =>
						previous.map((item) => (item.id === context.id ? context : item)),
					)
				}
				onOpenChange={(open) => {
					setIsDialogOpen(open);
					if (!open) setEditingContext(null);
				}}
			/>
		</>
	);
}
