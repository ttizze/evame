import type { TranslationJob } from "@prisma/client";
import { TranslationStatus } from "@prisma/client";
import { FileText, Languages, Loader2 } from "lucide-react";

export function TypeIcon({
	code,
	sourceLocale,
	translationJobs,
}: {
	code: string;
	sourceLocale: string;
	translationJobs?: TranslationJob[];
}) {
	const translationInfo = translationJobs?.find((job) => job.locale === code);

	if (code === sourceLocale) {
		return <FileText data-testid="text-icon" className="w-4 h-4 mr-2" />;
	}
	if (
		translationInfo &&
		translationInfo.status !== TranslationStatus.COMPLETED
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
