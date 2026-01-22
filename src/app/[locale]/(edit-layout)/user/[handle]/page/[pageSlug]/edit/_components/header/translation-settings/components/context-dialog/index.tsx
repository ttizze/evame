"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TranslationContext } from "../../types";
import {
	type CreateContextActionState,
	createContextAction,
	type UpdateContextActionState,
	updateContextAction,
} from "./action";

const CONTEXT_MAX_LENGTH = 500;

interface ContextDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	context: TranslationContext | null;
	/** Pre-filled name when creating from Creatable Select */
	initialName?: string | null;
	onContextCreated: (context: TranslationContext) => void;
	onContextUpdated: (context: TranslationContext) => void;
}

export function ContextDialog({
	isOpen,
	onOpenChange,
	context,
	initialName,
	onContextCreated,
	onContextUpdated,
}: ContextDialogProps) {
	const [contextText, setContextText] = useState("");

	const handleCreate = async (
		prev: CreateContextActionState,
		formData: FormData,
	): Promise<CreateContextActionState> => {
		const result = await createContextAction(prev, formData);
		if (result.success && result.data) {
			onContextCreated(result.data);
			toast.success("Context created");
			onOpenChange(false);
		} else if (result.message) {
			toast.error(result.message);
		}
		return result;
	};

	const handleUpdate = async (
		prev: UpdateContextActionState,
		formData: FormData,
	): Promise<UpdateContextActionState> => {
		const result = await updateContextAction(prev, formData);
		if (result.success && result.data) {
			onContextUpdated(result.data);
			toast.success("Context updated");
			onOpenChange(false);
		} else if (result.message) {
			toast.error(result.message);
		}
		return result;
	};

	const [, createAction, isCreating] = useActionState<
		CreateContextActionState,
		FormData
	>(handleCreate, { success: false });

	const [, updateAction, isUpdating] = useActionState<
		UpdateContextActionState,
		FormData
	>(handleUpdate, { success: false });

	useEffect(() => {
		if (isOpen) {
			setContextText(context?.context ?? "");
		}
	}, [isOpen, context]);

	const isPending = isCreating || isUpdating;

	return (
		<Dialog onOpenChange={onOpenChange} open={isOpen}>
			<DialogContent className="sm:max-w-[450px]">
				<DialogHeader>
					<DialogTitle>{context ? "Edit Context" : "New Context"}</DialogTitle>
					<DialogDescription>
						Instructions for AI when translating your content.
					</DialogDescription>
				</DialogHeader>
				<form
					action={context ? updateAction : createAction}
					className="space-y-4"
				>
					{context && <input name="id" type="hidden" value={context.id} />}
					<div className="space-y-2">
						<Label htmlFor="contextName">Context Name</Label>
						<Input
							defaultValue={context?.name ?? initialName ?? ""}
							id="contextName"
							key={initialName}
							maxLength={50}
							name="contextName"
							placeholder="e.g., Formal Japanese"
							required
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="context">Instructions</Label>
							<span className="text-xs text-muted-foreground">
								{contextText.length}/{CONTEXT_MAX_LENGTH}
							</span>
						</div>
						<Textarea
							defaultValue={context?.context ?? ""}
							id="context"
							maxLength={CONTEXT_MAX_LENGTH}
							name="context"
							onChange={(e) => setContextText(e.target.value)}
							placeholder="e.g., Use formal style. Keep technical terms in English."
							required
							rows={4}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button disabled={isPending} type="submit">
							{isPending ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : context ? (
								"Update"
							) : (
								"Create"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
