import type { UserAITranslationInfo } from "@prisma/client";
import { Form } from "@remix-run/react";
import { useNavigation } from "@remix-run/react";
import { useState } from "react";
import { LoadingSpinner } from "~/components/LoadingSpinner";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { supportedLocaleOptions } from "~/constants/languages";
import { GeminiApiKeyDialog } from "~/routes/resources+/gemini-api-key-dialog";
import LocaleSelector from "./LocaleSelector";
import { UserAITranslationStatus } from "./UserAITranslationStatus";

type TranslateSettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pageId: number;
	locale: string;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
};

export function TranslateSettingsDialog({
	open,
	onOpenChange,
	pageId,
	locale,
	hasGeminiApiKey,
	userAITranslationInfo,
}: TranslateSettingsDialogProps) {
	const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
	const navigation = useNavigation();
	const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="rounded-xl">
					<DialogHeader>
						<DialogTitle>Add New Translation</DialogTitle>
					</DialogHeader>
					<Form method="post" className="space-y-4">
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
									<SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
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
								value="translate"
								className="w-full"
								disabled={navigation.state === "submitting"}
							>
								{navigation.state === "submitting" ? (
									<LoadingSpinner />
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
					</Form>
					<UserAITranslationStatus
						userAITranslationInfo={userAITranslationInfo}
					/>
				</DialogContent>
			</Dialog>

			<GeminiApiKeyDialog
				isOpen={isApiKeyDialogOpen}
				onOpenChange={setIsApiKeyDialogOpen}
			/>
		</>
	);
}
