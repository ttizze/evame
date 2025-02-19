"use client";
import type { UserAITranslationInfo } from "@prisma/client";

import { GeminiApiKeyDialog } from "@/app/[locale]/components/gemini-api-key-dialog/gemini-api-key-dialog";
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
import type { TranslateTarget } from "../../../(common-layout)/user/[handle]/page/[slug]/constants";
import { LocaleSelector } from "../locale-selector";
import { UserAITranslationStatus } from "../user-ai-translation-status";
import { type TranslateActionState, translateAction } from "./action";

type AddTranslateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentHandle: string | undefined;
	pageId: number;
	sourceLocale: string;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	translateTarget: TranslateTarget;
};

export function AddTranslateDialog({
	open,
	onOpenChange,
	currentHandle,
	pageId,
	sourceLocale,
	hasGeminiApiKey,
	userAITranslationInfo,
	translateTarget,
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
									className="w-full	"
									localeOptions={supportedLocaleOptions}
									targetLocale={targetLocale}
									sourceLocale={sourceLocale}
									onChange={(value) => setTargetLocale(value)}
									showIcons={false}
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
							{translateState.zodErrors?.translateTarget && (
								<p className="text-red-500">
									{translateState.zodErrors.translateTarget[0]}
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
