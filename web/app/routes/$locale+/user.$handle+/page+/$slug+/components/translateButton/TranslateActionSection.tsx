import type { UserAITranslationInfo } from "@prisma/client";
import { Languages } from "lucide-react";
import { useState } from "react";
import { supportedLocaleOptions } from "~/constants/languages";
import LocaleSelector from "./LocaleSelector";
import { TranslateSettingsDialog } from "./TranslateSettingsDialog";
type TranslateActionSectionProps = {
	pageId: number;
	hasGeminiApiKey: boolean;
	userAITranslationInfo: UserAITranslationInfo | null;
	pageLocale: string;
	locale: string;
	existLocales: string[];
	className?: string;
	intent: "translatePage" | "translateComment";
};

export function TranslateActionSection({
	pageId,
	hasGeminiApiKey,
	userAITranslationInfo,
	pageLocale,
	locale,
	existLocales,
	className,
	intent,
}: TranslateActionSectionProps) {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	let pageLocaleOptions = supportedLocaleOptions.find(
		(sl) => sl.code === pageLocale,
	);
	if (!pageLocaleOptions) {
		pageLocaleOptions = { code: "und", name: "Unknown" };
	}
	const merged = [
		pageLocaleOptions,
		...existLocales.map((lc) => {
			const localeName =
				supportedLocaleOptions.find((sl) => sl.code === lc)?.name || lc;
			return { code: lc, name: localeName };
		}),
	];

	const existingOptions = merged.filter((option, index, self) => {
		return self.findIndex((o) => o.code === option.code) === index;
	});
	const currentLocaleCode =
		supportedLocaleOptions.find((sl) => sl.code === locale)?.code || locale;

	return (
		<div className={className}>
			<div className="flex items-center gap-2">
				<Languages className="w-4 h-4" />
				<LocaleSelector
					className="w-[200px]"
					localeOptions={existingOptions}
					defaultLocaleCode={currentLocaleCode}
					setIsSettingsOpen={setIsSettingsOpen}
				/>
			</div>

			<TranslateSettingsDialog
				open={isSettingsOpen}
				onOpenChange={setIsSettingsOpen}
				pageId={pageId}
				locale={locale}
				hasGeminiApiKey={hasGeminiApiKey}
				userAITranslationInfo={userAITranslationInfo}
				intent={intent}
			/>
		</div>
	);
}
