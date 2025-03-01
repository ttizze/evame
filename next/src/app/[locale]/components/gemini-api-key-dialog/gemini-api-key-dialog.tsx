"use client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowUpFromLine } from "lucide-react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
	type GeminiApiKeyDialogState,
	updateGeminiApiKeyAction,
} from "./action";

interface GeminiApiKeyDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export function GeminiApiKeyDialog({
	isOpen,
	onOpenChange,
}: GeminiApiKeyDialogProps) {
	const [state, formAction, isPending] = useActionState<
		GeminiApiKeyDialogState,
		FormData
	>(updateGeminiApiKeyAction, { success: false });

	useEffect(() => {
		if (state.success) {
			toast.success(state.message);
			onOpenChange(false);
		}
	}, [state.success, state.message, onOpenChange]);
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-center">Set Gemini API Key</DialogTitle>
				</DialogHeader>
				<div className="text-center mb-4">
					<a
						href="https://aistudio.google.com/app/apikey"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 transition-colors underline hover:text-blue-500"
					>
						<Button
							variant="default"
							size="sm"
							className="gap-2 shadow-md hover:shadow-lg transition-shadow"
						>
							<span className="">Get API Key at Google AI Studio</span>
							<ExternalLink className="w-4 h-4" />
						</Button>
					</a>
				</div>
				<form action={formAction}>
					<div className="flex items-center space-x-2">
						<Input
							type="password"
							name="geminiApiKey"
							required
							className="flex-grow"
							placeholder="Enter your Gemini API Key"
						/>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<ArrowUpFromLine className="w-4 h-4" />
							)}
						</Button>
					</div>
					<div className="text-red-500 text-center mt-2">
						{state.zodErrors?.geminiApiKey}
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
