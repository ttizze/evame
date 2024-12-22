import type { UserAITranslationInfo } from "@prisma/client";
import { ChevronsUpDown, Languages } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { supportedLocales } from "~/constants/languages";
import { cn } from "~/utils/cn";
import { TranslateSettingsDialog } from "./TranslateSettingsDialog";

type TranslateActionSectionProps = {
	pageId: number;
	userAITranslationInfo: UserAITranslationInfo | null;
	hasGeminiApiKey: boolean;
	locale: string;
};

export function TranslateActionSection({
	pageId,
	userAITranslationInfo,
	hasGeminiApiKey,
	locale,
}: TranslateActionSectionProps) {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	return (
		<div>
			<div className="flex items-center pt-3">
				<Languages className="w-4 h-4 mr-2" />
				<Button
					variant="outline"
					className={cn(
						"h-8 w-auto min-w-[200px] justify-between rounded-xl font-normal",
						"hover:bg-accent hover:text-accent-foreground",
					)}
					onClick={() => setIsSettingsOpen(true)}
				>
					<span className="md:w-auto">
						{supportedLocales.find((l) => l.code === locale)?.name || locale}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</div>
			<TranslateSettingsDialog
				open={isSettingsOpen}
				onOpenChange={setIsSettingsOpen}
				pageId={pageId}
				locale={locale}
				hasGeminiApiKey={hasGeminiApiKey}
				userAITranslationInfo={userAITranslationInfo}
			/>
		</div>
	);
}
