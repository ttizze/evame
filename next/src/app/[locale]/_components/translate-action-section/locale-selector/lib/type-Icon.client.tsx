import type { PageAITranslationInfo } from "@prisma/client";
import { TranslationStatus } from "@prisma/client";
import { Languages, Loader2, Text } from "lucide-react";

export function TypeIcon({
	code,
	sourceLocale,
	pageAITranslationInfo,
}: {
	code: string;
	sourceLocale: string;
	pageAITranslationInfo?: PageAITranslationInfo[];
}) {
	const translationInfo = pageAITranslationInfo?.find(
		(info) => info.locale === code,
	);

	if (code === sourceLocale) {
		return <Text data-testid="text-icon" className="w-4 h-4 mr-2" />;
	}
	if (
		translationInfo &&
		translationInfo.aiTranslationStatus !== TranslationStatus.COMPLETED
	) {
		return (
			<Loader2
				data-testid="loader-icon"
				className="w-4 h-4 mr-2 animate-spin"
			/>
		);
	}

	return <Languages data-testid="languages-icon" className="w-4 h-4 mr-2" />;
}
