"use client";

import { Loader2, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TranslationContext } from "../../types";
import { ContextDialog } from "../context-dialog";
import { type DeleteContextActionState, deleteContextAction } from "./action";

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

	const handleDelete = async (
		prev: DeleteContextActionState,
		formData: FormData,
	): Promise<DeleteContextActionState> => {
		const id = Number(formData.get("id"));
		const result = await deleteContextAction(prev, formData);
		if (result.success) {
			setContexts((prev) => prev.filter((c) => c.id !== id));
			if (selectedContextId === id) {
				onContextChange(null);
			}
			toast.success("Context deleted");
		} else if (result.message) {
			toast.error(result.message);
		}
		return result;
	};

	const [, deleteAction, isDeleting] = useActionState<
		DeleteContextActionState,
		FormData
	>(handleDelete, { success: false });

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
					{contexts.map((ctx) => (
						<div
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent group",
								selectedContextId === ctx.id && "bg-accent",
							)}
							key={ctx.id}
						>
							<button
								className="flex-1 min-w-0 text-left cursor-pointer"
								onClick={() => onContextChange(ctx.id)}
								type="button"
							>
								<div className="font-medium text-sm truncate">{ctx.name}</div>
								<div className="text-xs text-muted-foreground truncate">
									{ctx.context}
								</div>
							</button>
							<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									className="p-1 hover:bg-background rounded cursor-pointer"
									onClick={() => {
										setEditingContext(ctx);
										setIsDialogOpen(true);
									}}
									type="button"
								>
									<Pencil className="size-4" />
								</button>
								<form action={deleteAction}>
									<input name="id" type="hidden" value={ctx.id} />
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
				onContextCreated={(ctx) => setContexts((prev) => [...prev, ctx])}
				onContextUpdated={(ctx) =>
					setContexts((prev) => prev.map((c) => (c.id === ctx.id ? ctx : c)))
				}
				onOpenChange={(open) => {
					setIsDialogOpen(open);
					if (!open) setEditingContext(null);
				}}
			/>
		</>
	);
}
