"use client";
import type { UserAITranslationInfo } from "@prisma/client";

import { useState } from "react";
import LocaleSelector from "@/app/[locale]/components/locale-selector";
import { StartButton } from "@/app/[locale]/components/start-button";
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
import { supportedLocaleOptions } from "@/app/constants/locale";
import { GeminiApiKeyDialog } from "@/app/[locale]/components/gemini-api-key-dialog/gemini-api-key-dialog";
import { UserAITranslationStatus } from "./UserAITranslationStatus";
import { Loader2 } from "lucide-react";
import { useActionState } from "react";

type TranslateSettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentHandle: string | undefined;
	pageId: number;
	locale: string;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	intent: "translatePage" | "translateComment";
};

export function TranslateSettingsDialog({
	open,
	onOpenChange,
	currentHandle,
	pageId,
	locale,
	hasGeminiApiKey,
	userAITranslationInfo,
	intent,
}: TranslateSettingsDialogProps) {
	const [state, formAction] = useActionState(async (formData: FormData) => {
		const pageId = formData.get("pageId");
		const aiModel = formData.get("aiModel");
		const locale = formData.get("locale");
		const intent = formData.get("intent");
		const result = await translatePage(pageId, aiModel, locale, intent);
	}, null);
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
							<form method="post" className="space-y-4">
								<input type="hidden" name="pageId" value={pageId} />
								<input type="hidden" name="aiModel" value={selectedModel} />
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
									<Button
										type="submit"
										name="intent"
										value={intent}
										className="w-full"
									>
										{router.state === "submitting" ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											"Translate"
										)}
									</Button>
								) : (
									<Button
										type="button"
										onClick={() => setIsApiKeyDialogOpen(true)}
										className="w-full"
									>
										Set API Key
									</Button>
								)}
							</form>
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
