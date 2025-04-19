"use client";
import type { TranslationJob } from "@prisma/client";
import { useState } from "react";
import type { TargetContentType } from "../../(common-layout)/user/[handle]/page/[slug]/constants";
import { AddTranslateDialog } from "./add-translate-dialog/client";
import { LocaleSelector } from "./locale-selector/client";
type TranslateActionSectionClientProps = {
	pageId: number;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	translationJobs?: TranslationJob[];
	latestUserTranslationJob: TranslationJob | null;
	sourceLocale: string;
	targetContentType: TargetContentType;
	className?: string;
	showIcons: boolean;
};

export function TranslateActionSectionClient({
	pageId,
	currentHandle,
	hasGeminiApiKey,
	translationJobs,
	latestUserTranslationJob,
	sourceLocale,
	targetContentType,
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
					translationJobs={translationJobs}
					showIcons={showIcons}
				/>
			</div>
			<AddTranslateDialog
				open={addTranslateDialogOpen}
				onOpenChange={setAddTranslateDialogOpen}
				currentHandle={currentHandle}
				pageId={pageId}
				hasGeminiApiKey={hasGeminiApiKey}
				latestUserTranslationJob={latestUserTranslationJob}
				targetContentType={targetContentType}
			/>
		</div>
	);
}
