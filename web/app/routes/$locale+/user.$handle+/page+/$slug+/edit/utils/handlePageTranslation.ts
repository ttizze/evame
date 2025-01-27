import { hasExistingTranslation } from "~/features/translate/functions/query.server";
import { getTranslateUserQueue } from "~/features/translate/translate-user-queue";
import type { TranslateJobParams } from "~/features/translate/types";
import { createUserAITranslationInfo } from "~/routes/$locale+/user.$handle+/page+/$slug+/functions/mutations.server";
import { fetchPageWithSourceTexts } from "~/routes/$locale+/user.$handle+/page+/$slug+/functions/queries.server";
import { TranslationIntent } from "~/routes/$locale+/user.$handle+/page+/$slug+/index";
export async function handlePageTranslation({
	currentUserId,
	pageId,
	sourceLanguage,
	geminiApiKey,
	title,
}: {
	currentUserId: number;
	pageId: number;
	sourceLanguage: string;
	geminiApiKey: string;
	title: string;
}): Promise<void> {
	const locale = sourceLanguage === "en" ? "ja" : "en";

	const hasTranslation = await hasExistingTranslation(pageId, locale);
	if (hasTranslation) {
		return;
	}

	const userAITranslationInfo = await createUserAITranslationInfo(
		currentUserId,
		pageId,
		locale,
		"gemini-1.5-flash",
	);

	const pageWithSourceTexts = await fetchPageWithSourceTexts(pageId);
	if (!pageWithSourceTexts) {
		throw new Error("Page with source texts not found");
	}

	const queue = getTranslateUserQueue(currentUserId);
	const jobParams: TranslateJobParams = {
		userAITranslationInfoId: userAITranslationInfo.id,
		geminiApiKey: geminiApiKey,
		aiModel: "gemini-1.5-flash",
		userId: currentUserId,
		pageId: pageId,
		locale: locale,
		title: title,
		numberedElements: pageWithSourceTexts.sourceTexts.map((st) => ({
			number: st.number,
			text: st.text,
		})),
		translationIntent: TranslationIntent.TRANSLATE_PAGE,
	};

	await queue.add(`translate-${currentUserId}`, jobParams);
}
