"use client";
import { useState } from "react";
import type { TargetContentType } from "../../(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { AddTranslateDialog } from "./add-translate-dialog/client";
import { LocaleSelector } from "./locale-selector/client";
type TranslateActionSectionClientProps = {
	pageId?: number;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	targetContentType: TargetContentType;
	className?: string;
	showIcons: boolean;
};

export function TranslateActionSectionClient({
	pageId,
	currentHandle,
	hasGeminiApiKey,
	targetContentType,
	className,
	showIcons,
}: TranslateActionSectionClientProps) {
	const [addTranslateDialogOpen, setAddTranslateDialogOpen] = useState(false);
	return (
		<div className={className}>
			<div className="flex items-center gap-2">
				<LocaleSelector
					pageId={pageId}
					className="w-[200px]"
					onAddNew={() => setAddTranslateDialogOpen(true)}
					showIcons={showIcons}
				/>
			</div>
			<AddTranslateDialog
				open={addTranslateDialogOpen}
				onOpenChange={setAddTranslateDialogOpen}
				currentHandle={currentHandle}
				pageId={pageId}
				hasGeminiApiKey={hasGeminiApiKey}
				targetContentType={targetContentType}
			/>
		</div>
	);
}
