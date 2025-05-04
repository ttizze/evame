"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AddTranslateDialog } from "./add-translate-dialog/client";
import { LocaleSelector } from "./locale-selector/client";
type TranslateActionSectionClientProps = {
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
};

export function TranslateActionSectionClient({
	currentHandle,
	hasGeminiApiKey,
}: TranslateActionSectionClientProps) {
	const [addTranslateDialogOpen, setAddTranslateDialogOpen] = useState(false);
	const { pageSlug, projectSlug } = useParams<{
		pageSlug?: string;
		projectSlug?: string;
	}>();
	return (
		<div>
			<div className="flex items-center gap-2">
				<LocaleSelector
					className="w-[200px]"
					onAddNew={() => setAddTranslateDialogOpen(true)}
					pageSlug={pageSlug}
					projectSlug={projectSlug}
				/>
			</div>
			{pageSlug || projectSlug ? (
				<AddTranslateDialog
					open={addTranslateDialogOpen}
					onOpenChange={setAddTranslateDialogOpen}
					currentHandle={currentHandle}
					hasGeminiApiKey={hasGeminiApiKey}
					pageSlug={pageSlug}
					projectSlug={projectSlug}
				/>
			) : null}
		</div>
	);
}
