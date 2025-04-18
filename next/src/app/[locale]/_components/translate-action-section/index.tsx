import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import type {
	PageAITranslationInfo,
	UserAITranslationInfo,
} from "@prisma/client";
import type { TargetContentType } from "../../(common-layout)/user/[handle]/page/[slug]/constants";
import { TranslateActionSectionClient } from "./client";
type TranslateActionSectionProps = {
	pageId: number;
	currentHandle: string | undefined;
	userAITranslationInfo: UserAITranslationInfo | null;
	pageAITranslationInfo?: PageAITranslationInfo[];
	sourceLocale: string;
	targetContentType: TargetContentType;
	className?: string;
	showIcons: boolean;
};

export async function TranslateActionSection({
	pageId,
	currentHandle,
	userAITranslationInfo,
	pageAITranslationInfo,
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
			userAITranslationInfo={userAITranslationInfo}
			pageAITranslationInfo={pageAITranslationInfo}
			sourceLocale={sourceLocale}
			targetContentType={targetContentType}
			className={className}
			showIcons={showIcons}
		/>
	);
}
