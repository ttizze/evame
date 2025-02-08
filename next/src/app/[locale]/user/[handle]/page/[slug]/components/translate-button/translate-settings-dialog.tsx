"use client";
import type { UserAITranslationInfo } from "@prisma/client";

import { GeminiApiKeyDialog } from "@/app/[locale]/components/gemini-api-key-dialog/gemini-api-key-dialog";
import LocaleSelector from "@/app/[locale]/components/locale-selector";
import { StartButton } from "@/app/[locale]/components/start-button";
import { supportedLocaleOptions } from "@/app/constants/locale";
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
import type { TranslateTarget } from "../../constants";
import { type PageTranslateActionState, pageTranslateAction } from "./action";
import { UserAITranslationStatus } from "./user-ai-translation-status";

type TranslateSettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentHandle: string | undefined;
	pageId: number;
	locale: string;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	translateTarget: TranslateTarget;
};

export function TranslateSettingsDialog({
	open,
	onOpenChange,
	currentHandle,
	pageId,
	locale,
	hasGeminiApiKey,
	userAITranslationInfo,
	translateTarget,
}: TranslateSettingsDialogProps) {
	const [translateState, translateAction, isTranslating] = useActionState<
		PageTranslateActionState,
		FormData
	>(pageTranslateAction, {});

	const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="rounded-xl">
					{!currentHandle ? (
						<div className="text-center">
							<p className="text-lg mb-3">Please log in to Add Translation</p>
							<StartButton />
						</div>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>Add New Translation</DialogTitle>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="language">Language</Label>
								<LocaleSelector
									className="w-full"
									localeOptions={supportedLocaleOptions}
									defaultLocaleCode={locale}
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
								<form
									action={translateAction}
									onSubmit={(e) => {
										// デバッグ用
										const formData = new FormData(e.currentTarget);
										console.log("Form submission:", {
											defaultLocale: locale,
											defaultPageId: pageId,
											defaultAiModel: selectedModel,
											defaultTranslateTarget: translateTarget,
											locale: formData.get("locale"),
											pageId: formData.get("pageId"),
											aiModel: formData.get("aiModel"),
											translateTarget: formData.get("translateTarget"),
										});
									}}
								>
									<input type="hidden" name="locale" value={locale} />
									<input type="hidden" name="pageId" value={pageId} />
									<input type="hidden" name="aiModel" value={selectedModel} />
									<input
										type="hidden"
										name="translateTarget"
										value={translateTarget}
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
							{translateState.fieldErrors?.pageId && (
								<p className="text-red-500">
									{translateState.fieldErrors.pageId[0]}
								</p>
							)}
							{translateState.fieldErrors?.aiModel && (
								<p className="text-red-500">
									{translateState.fieldErrors.aiModel[0]}
								</p>
							)}
							{translateState.fieldErrors?.locale && (
								<p className="text-red-500">
									{translateState.fieldErrors.locale[0]}
								</p>
							)}
							{translateState.fieldErrors?.translateTarget && (
								<p className="text-red-500">
									{translateState.fieldErrors.translateTarget[0]}
								</p>
							)}
							<UserAITranslationStatus
								userAITranslationInfo={userAITranslationInfo}
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
