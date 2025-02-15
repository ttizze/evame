"use client";
import { supportedLocaleOptions } from "@/app/constants/locale";
import type { UserAITranslationInfo } from "@prisma/client";
import { Languages } from "lucide-react";
import { useState } from "react";
import type { TranslateTarget } from "../../(common-layout)/user/[handle]/page/[slug]/constants";
import { AddTranslateDialog } from "./add-translate-dialog";
import { LocaleSelector } from "./locale-selector";
type TranslateActionSectionProps = {
	pageId: number;
	currentHandle: string | undefined;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	sourceLocale: string;
	locale: string;
	existLocales: string[];
	className?: string;
	translateTarget: TranslateTarget;
	showAddNew?: boolean;
};

export function TranslateActionSection({
	pageId,
	currentHandle,
	hasGeminiApiKey,
	userAITranslationInfo,
	sourceLocale,
	locale,
	existLocales,
	className,
	translateTarget,
	showAddNew,
}: TranslateActionSectionProps) {
	let sourceLocaleOptions = supportedLocaleOptions.find(
		(sl) => sl.code === sourceLocale,
	);
	if (!sourceLocaleOptions) {
		sourceLocaleOptions = { code: "und", name: "Unknown" };
	}
	const merged = [
		sourceLocaleOptions,
		...existLocales.map((lc) => {
			const localeName =
				supportedLocaleOptions.find((sl) => sl.code === lc)?.name || lc;
			return { code: lc, name: localeName };
		}),
	];

	const existingOptions = merged.filter((option, index, self) => {
		return self.findIndex((o) => o.code === option.code) === index;
	});
	const [addTranslateDialogOpen, setAddTranslateDialogOpen] = useState(false);
	return (
		<div className={className}>
			<div className="flex items-center gap-2">
				<Languages className="w-4 h-4" />
				<LocaleSelector
					locale={locale}
					className="w-[200px]"
					localeOptions={existingOptions}
					showAddNew={showAddNew}
					onAddNew={() => setAddTranslateDialogOpen(true)}
				/>
			</div>
			<AddTranslateDialog
				open={addTranslateDialogOpen}
				onOpenChange={setAddTranslateDialogOpen}
				currentHandle={currentHandle}
				pageId={pageId}
				locale={locale}
				hasGeminiApiKey={hasGeminiApiKey}
				userAITranslationInfo={userAITranslationInfo}
				translateTarget={translateTarget}
			/>
		</div>
	);
}
