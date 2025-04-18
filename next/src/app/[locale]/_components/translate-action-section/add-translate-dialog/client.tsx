"use client";
import type { TranslationJob } from "@prisma/client";

import { GeminiApiKeyDialog } from "@/app/[locale]/_components/gemini-api-key-dialog/gemini-api-key-dialog";
import { StartButton } from "@/app/[locale]/_components/start-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useActionState } from "react";
import type { TargetContentType } from "../../../(common-layout)/user/[handle]/page/[slug]/constants";
import { type TranslateActionState, translateAction } from "./action";
import { DialogLocaleSelector } from "./dialog-locale-selector";
import { UserAITranslationStatus } from "./user-ai-translation-status";

type AddTranslateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentHandle: string | undefined;
	pageId: number;
	hasGeminiApiKey: boolean;
	latestUserTranslationJob: TranslationJob | null;
	targetContentType: TargetContentType;
};

export function AddTranslateDialog({
	open,
	onOpenChange,
	currentHandle,
	pageId,
	hasGeminiApiKey,
	latestUserTranslationJob,
	targetContentType,
}: AddTranslateDialogProps) {
	const [translateState, action, isTranslating] = useActionState<
		TranslateActionState,
		FormData
	>(translateAction, { success: false });
	const [targetLocale, setTargetLocale] = useState("");
	const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="rounded-xl">
					{!currentHandle ? (
						<div className="text-center">
							<DialogHeader>
								<DialogTitle className="text-lg text-center mb-4">
									Please log in to Add Translation
								</DialogTitle>
							</DialogHeader>
							<StartButton />
						</div>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>Add New Translation</DialogTitle>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="language">Language</Label>
								<DialogLocaleSelector
									targetLocale={targetLocale}
									onChange={(value) => setTargetLocale(value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="ai-model">AI Model</Label>
								<Select
									value={selectedModel}
									onValueChange={(value) => setSelectedModel(value)}
								>
									<SelectTrigger className="rounded-xl">
										<SelectValue placeholder="Select a model" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="gemini-1.5-flash">
											Gemini 1.5 Flash
										</SelectItem>
										<SelectItem value="gemini-1.5-pro">
											Gemini 1.5 Pro
										</SelectItem>
										<SelectItem value="gemini-2.0-flash-exp">
											gemini-2.0-flash-exp
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{hasGeminiApiKey ? (
								<form action={action}>
									<input
										type="hidden"
										name="targetLocale"
										value={targetLocale}
									/>
									<input type="hidden" name="pageId" value={pageId} />
									<input type="hidden" name="aiModel" value={selectedModel} />
									<input
										type="hidden"
										name="targetContentType"
										value={targetContentType}
									/>
									<Button type="submit" className="w-full">
										{isTranslating ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											"Translate"
										)}
									</Button>
								</form>
							) : (
								<Button
									type="button"
									onClick={() => setIsApiKeyDialogOpen(true)}
									className="w-full"
								>
									Set API Key
								</Button>
							)}
							{translateState.zodErrors?.pageId && (
								<p className="text-red-500">
									{translateState.zodErrors.pageId[0]}
								</p>
							)}
							{translateState.zodErrors?.aiModel && (
								<p className="text-red-500">
									{translateState.zodErrors.aiModel[0]}
								</p>
							)}
							{translateState.zodErrors?.targetLocale && (
								<p className="text-red-500">
									{translateState.zodErrors.targetLocale[0]}
								</p>
							)}
							{translateState.zodErrors?.targetContentType && (
								<p className="text-red-500">
									{translateState.zodErrors.targetContentType[0]}
								</p>
							)}
							<UserAITranslationStatus
								latestUserTranslationJob={latestUserTranslationJob}
							/>
						</>
					)}
				</DialogContent>
			</Dialog>

			<GeminiApiKeyDialog
				isOpen={isApiKeyDialogOpen}
				onOpenChange={setIsApiKeyDialogOpen}
			/>
		</>
	);
}
