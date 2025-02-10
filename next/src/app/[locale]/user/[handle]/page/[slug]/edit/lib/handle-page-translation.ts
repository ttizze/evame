import { TranslateTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { createUserAITranslationInfo } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/db/mutations.server";
import { fetchPageWithPageSegments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/db/queries.server";
import { hasExistingTranslation } from "@/features/translate/db/query.server";
import { getTranslateUserQueue } from "@/features/translate/translate-user-queue";
import type { TranslateJobParams } from "@/features/translate/types";
export async function handlePageTranslation({
	currentUserId,
	pageId,
	sourceLocale,
	geminiApiKey,
	title,
}: {
	currentUserId: string;
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
		translateTarget: TranslateTarget.TRANSLATE_PAGE,
	};

	await queue.add(`translate-${currentUserId}`, jobParams);
}
