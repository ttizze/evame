"use client";
import { supportedLocaleOptions } from "@/app/constants/locale";
import type { LocaleOption } from "@/app/constants/locale";
import type { UserAITranslationInfo } from "@prisma/client";
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
	targetLocale: string;
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
	targetLocale,
	existLocales,
	className,
	translateTarget,
	showAddNew,
}: TranslateActionSectionProps) {
	const localeOptions = buildLocaleOptions(
		sourceLocale,
		existLocales,
		supportedLocaleOptions,
	);

	const [addTranslateDialogOpen, setAddTranslateDialogOpen] = useState(false);
	return (
		<div className={className}>
			<div className="flex items-center gap-2">
				<LocaleSelector
					targetLocale={targetLocale}
					sourceLocale={sourceLocale}
					className="w-[200px]"
					localeOptions={localeOptions}
					showAddNew={showAddNew}
					onAddNew={() => setAddTranslateDialogOpen(true)}
				/>
			</div>
			<AddTranslateDialog
				open={addTranslateDialogOpen}
				onOpenChange={setAddTranslateDialogOpen}
				currentHandle={currentHandle}
				pageId={pageId}
				sourceLocale={sourceLocale}
				hasGeminiApiKey={hasGeminiApiKey}
				userAITranslationInfo={userAITranslationInfo}
				translateTarget={translateTarget}
			/>
		</div>
	);
}

function buildLocaleOptions(
	sourceLocale: string,
	existLocales: string[],
	supportedLocaleOptions: LocaleOption[],
): LocaleOption[] {
	// Get info for the source locale.
	const sourceLocaleOption = supportedLocaleOptions.find(
		(sl) => sl.code === sourceLocale,
	) ?? { code: "und", name: "Unknown" };
	// For each existing locale, make an option
	const merged = [
		sourceLocaleOption,
		...existLocales.map((lc) => {
			const localeName =
				supportedLocaleOptions.find((sl) => sl.code === lc)?.name || lc;
			return { code: lc, name: localeName };
		}),
	];

	const existingOptions = merged.filter((option, index, self) => {
		return self.findIndex((o) => o.code === option.code) === index;
	});
	return existingOptions;
}
