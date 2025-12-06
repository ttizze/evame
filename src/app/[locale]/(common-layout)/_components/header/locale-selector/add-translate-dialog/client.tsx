"use client";

import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useActionState, useState } from "react";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import { GeminiApiKeyDialog } from "@/app/[locale]/(common-layout)/_components/gemini-api-key-dialog/gemini-api-key-dialog";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
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
import { type TranslateActionState, translateAction } from "./action";
import { DialogLocaleSelector } from "./dialog-locale-selector";

type AddTranslateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	pageSlug?: string;
};

export function AddTranslateDialog({
	open,
	onOpenChange,
	currentHandle,
	hasGeminiApiKey,
	pageSlug,
}: AddTranslateDialogProps) {
	const currentLocale = useLocale();
	if (pageSlug) {
	} else {
		throw new Error("pageSlug is required");
	}
	const [translateState, action, isTranslating] = useActionState<
		TranslateActionState,
		FormData
	>(translateAction, { success: false });
	const [targetLocale, setTargetLocale] = useState(currentLocale);
	const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
	const { toastJobs } = useTranslationJobs(
		translateState.success ? (translateState.data?.translationJobs ?? []) : [],
	);

	useTranslationJobToast(toastJobs);
	return (
		<>
			<Dialog onOpenChange={onOpenChange} open={open}>
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
									onChange={(value) => setTargetLocale(value)}
									targetLocale={targetLocale}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="ai-model">AI Model</Label>
								<Select
									onValueChange={(value) => setSelectedModel(value)}
									value={selectedModel}
								>
									<SelectTrigger className="rounded-xl">
										<SelectValue placeholder="Select a model" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="gemini-2.0-flash">
											gemini-2.0-flash
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{hasGeminiApiKey ? (
								<form action={action}>
									<input
										name="targetLocale"
										type="hidden"
										value={targetLocale}
									/>
									<input name="pageSlug" type="hidden" value={pageSlug} />
									<input name="aiModel" type="hidden" value={selectedModel} />
									<Button
										className="w-full"
										disabled={isTranslating}
										type="submit"
									>
										{isTranslating ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											"Translate"
										)}
									</Button>
								</form>
							) : (
								<Button
									className="w-full"
									onClick={() => setIsApiKeyDialogOpen(true)}
									type="button"
								>
									Set API Key
								</Button>
							)}
							{translateState.message && (
								<p className="text-red-500">{translateState.message}</p>
							)}
							{!translateState.success &&
								translateState.zodErrors?.pageSlug && (
									<p className="text-red-500">
										{translateState.zodErrors.pageSlug[0]}
									</p>
								)}

							{!translateState.success && translateState.zodErrors?.aiModel && (
								<p className="text-red-500">
									{translateState.zodErrors.aiModel[0]}
								</p>
							)}
							{!translateState.success &&
								translateState.zodErrors?.targetLocale && (
									<p className="text-red-500">
										{translateState.zodErrors.targetLocale[0]}
									</p>
								)}
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
