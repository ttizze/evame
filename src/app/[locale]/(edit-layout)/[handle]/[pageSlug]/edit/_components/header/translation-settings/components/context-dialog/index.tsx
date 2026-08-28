"use client";

import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
	createContext,
	type UpdateContextActionState,
	updateContext,
} from "./action";

const CONTEXT_MAX_LENGTH = 500;

interface ContextDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	context: TranslationContext | null;
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
	const [createState, setCreateState] = useState<CreateContextActionState>({
		success: false,
	});
	const [updateState, setUpdateState] = useState<UpdateContextActionState>({
		success: false,
	});
	const [isCreating, startCreating] = useTransition();
	const [isUpdating, startUpdating] = useTransition();
	const createContextFn = useServerFn(createContext);
	const updateContextFn = useServerFn(updateContext);

	useEffect(() => {
		if (isOpen) setContextText(context?.context ?? "");
	}, [isOpen, context]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		if (context) {
			startUpdating(async () => {
				const result = await updateContextFn({ data: formData });
				setUpdateState(result);
				if (result.success && result.data) {
					onContextUpdated(result.data);
					toast.success("Context updated");
					onOpenChange(false);
				} else if (!result.success) {
					toast.error(
						result.message ??
							Object.values(result.zodErrors ?? {})
								.flat()
								.join(", "),
					);
				}
			});
			return;
		}
		startCreating(async () => {
			const result = await createContextFn({ data: formData });
			setCreateState(result);
			if (result.success && result.data) {
				onContextCreated(result.data);
				toast.success("Context created");
				onOpenChange(false);
			} else if (!result.success) {
				toast.error(
					result.message ??
						Object.values(result.zodErrors ?? {})
							.flat()
							.join(", "),
				);
			}
		});
	};

	const isPending = isCreating || isUpdating;
	const errorState = context ? updateState : createState;

	return (
		<Dialog onOpenChange={onOpenChange} open={isOpen}>
			<DialogContent className="sm:max-w-[450px]">
				<DialogHeader>
					<DialogTitle>{context ? "Edit Context" : "New Context"}</DialogTitle>
					<DialogDescription>
						Instructions for AI when translating your content.
					</DialogDescription>
				</DialogHeader>
				<form className="space-y-4" onSubmit={handleSubmit}>
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
							onChange={(event) => setContextText(event.target.value)}
							placeholder="e.g., Use formal style. Keep technical terms in English."
							required
							rows={4}
						/>
					</div>
					{!errorState.success && errorState.message && (
						<p className="text-sm text-red-500">{errorState.message}</p>
					)}
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
