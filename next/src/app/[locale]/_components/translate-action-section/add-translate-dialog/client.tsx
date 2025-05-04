"use client";

import { GeminiApiKeyDialog } from "@/app/[locale]/_components/gemini-api-key-dialog/gemini-api-key-dialog";
import { StartButton } from "@/app/[locale]/_components/start-button";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
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
import type { TargetContentType } from "../../../(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { type TranslateActionState, translateAction } from "./action";
import { DialogLocaleSelector } from "./dialog-locale-selector";

type AddTranslateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	pageSlug?: string;
	projectSlug?: string;
};

export function AddTranslateDialog({
	open,
	onOpenChange,
	currentHandle,
	hasGeminiApiKey,
	pageSlug,
	projectSlug,
}: AddTranslateDialogProps) {
	let targetContentType: TargetContentType;
	if (pageSlug) {
		targetContentType = "page";
	} else if (projectSlug) {
		targetContentType = "project";
	} else {
		throw new Error("pageSlug or projectSlug is required");
	}
	const [translateState, action, isTranslating] = useActionState<
		TranslateActionState,
		FormData
	>(translateAction, { success: false });
	const [targetLocale, setTargetLocale] = useState("");
	const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
	const { jobs } = useTranslationJobs(
		translateState.success ? (translateState.data?.translationJobs ?? []) : [],
	);

	useTranslationJobToast(jobs);
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
									<input type="hidden" name="pageSlug" value={pageSlug} />
									<input type="hidden" name="projectSlug" value={projectSlug} />
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
							{!translateState.success &&
								translateState.zodErrors?.pageSlug && (
									<p className="text-red-500">
										{translateState.zodErrors.pageSlug[0]}
									</p>
								)}
							{!translateState.success &&
								translateState.zodErrors?.projectSlug && (
									<p className="text-red-500">
										{translateState.zodErrors.projectSlug[0]}
									</p>
								)}
							{!translateState.success &&
								translateState.zodErrors?.projectSlug && (
									<p className="text-red-500">
										{translateState.zodErrors.projectSlug[0]}
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
							{!translateState.success &&
								translateState.zodErrors?.targetContentType && (
									<p className="text-red-500">
										{translateState.zodErrors.targetContentType[0]}
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
