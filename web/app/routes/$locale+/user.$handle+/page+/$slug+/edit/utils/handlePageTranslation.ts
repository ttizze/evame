import { hasExistingTranslation } from "~/features/translate/functions/query.server";
import { getTranslateUserQueue } from "~/features/translate/translate-user-queue";
import type { TranslateJobParams } from "~/features/translate/types";
import { createUserAITranslationInfo } from "~/routes/$locale+/user.$handle+/page+/$slug+/functions/mutations.server";
import { fetchPageWithPageSegments } from "~/routes/$locale+/user.$handle+/page+/$slug+/functions/queries.server";
import { TranslationIntent } from "~/routes/$locale+/user.$handle+/page+/$slug+/index";
export async function handlePageTranslation({
	currentUserId,
	pageId,
	sourceLocale,
	geminiApiKey,
	title,
}: {
	currentUserId: number;
	pageId: number;
	sourceLocale: string;
	geminiApiKey: string;
	title: string;
}): Promise<void> {
	const locale = sourceLocale === "en" ? "ja" : "en";

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

	const pageWithPageSegments = await fetchPageWithPageSegments(pageId);
	if (!pageWithPageSegments) {
		throw new Error("Page with page segments not found");
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
		numberedElements: pageWithPageSegments.pageSegments.map((st) => ({
			number: st.number,
			text: st.text,
		})),
		translationIntent: TranslationIntent.TRANSLATE_PAGE,
	};

	await queue.add(`translate-${currentUserId}`, jobParams);
}
