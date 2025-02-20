"use client";
import type {
	PageAITranslationInfo,
	UserAITranslationInfo,
} from "@prisma/client";
import { useState } from "react";
import type { TranslateTarget } from "../../(common-layout)/user/[handle]/page/[slug]/constants";
import { AddTranslateDialog } from "./add-translate-dialog";
import { LocaleSelector } from "./locale-selector";
type TranslateActionSectionClientProps = {
	pageId: number;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	pageAITranslationInfo?: PageAITranslationInfo[];
	sourceLocale: string;
	translateTarget: TranslateTarget;
	className?: string;
	showIcons: boolean;
};

export function TranslateActionSectionClient({
	pageId,
	currentHandle,
	hasGeminiApiKey,
	userAITranslationInfo,
	pageAITranslationInfo,
	sourceLocale,
	translateTarget,
	className,
	showIcons,
}: TranslateActionSectionClientProps) {
	const [addTranslateDialogOpen, setAddTranslateDialogOpen] = useState(false);
	return (
		<div className={className}>
			<div className="flex items-center gap-2">
				<LocaleSelector
					sourceLocale={sourceLocale}
					className="w-[200px]"
					onAddNew={() => setAddTranslateDialogOpen(true)}
					pageAITranslationInfo={pageAITranslationInfo}
					showIcons={showIcons}
				/>
			</div>
			<AddTranslateDialog
				open={addTranslateDialogOpen}
				onOpenChange={setAddTranslateDialogOpen}
				currentHandle={currentHandle}
				pageId={pageId}
				hasGeminiApiKey={hasGeminiApiKey}
				userAITranslationInfo={userAITranslationInfo}
				translateTarget={translateTarget}
			/>
		</div>
	);
}
