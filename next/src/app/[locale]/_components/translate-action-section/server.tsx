import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import type { TranslationJob } from "@prisma/client";
import type { TargetContentType } from "../../(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { TranslateActionSectionClient } from "./client";

type TranslateActionSectionProps = {
	pageId?: number;
	currentHandle: string | undefined;
	translationJobs?: TranslationJob[];
	latestUserTranslationJob: TranslationJob | null;
	sourceLocale: string;
	targetContentType: TargetContentType;
	className?: string;
	showIcons: boolean;
};

export async function TranslateActionSection({
	pageId,
	currentHandle,
	translationJobs,
	latestUserTranslationJob,
	sourceLocale,
	targetContentType,
	className,
	showIcons,
}: TranslateActionSectionProps) {
	const geminiApiKey = await fetchGeminiApiKeyByHandle(currentHandle ?? "");
	const hasGeminiApiKey = !!geminiApiKey;
	return (
		<TranslateActionSectionClient
			pageId={pageId}
			currentHandle={currentHandle}
			hasGeminiApiKey={hasGeminiApiKey}
			targetContentType={targetContentType}
			className={className}
			showIcons={showIcons}
		/>
	);
}
