import { TranslateTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { fetchPageWithPageSegments } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/db/queries.server";
import {
	createPageAITranslationInfo,
	createUserAITranslationInfo,
} from "@/app/[locale]/db/mutations.server";
import { BASE_URL } from "@/app/constants/base-url";
import type { TranslateJobParams } from "@/features/translate/types";
import { hasExistingTranslation } from "../db/queries.server";

export async function handlePageTranslation({
	currentUserId,
	pageId,
	sourceLocale,
	geminiApiKey,
}: {
	currentUserId: string;
	pageId: number;
	sourceLocale: string;
	geminiApiKey: string;
}): Promise<void> {
	const targetLocale = sourceLocale === "en" ? "ja" : "en";
	const hasTranslation = await hasExistingTranslation(pageId, targetLocale);
	if (hasTranslation) {
		return;
	}

	const userAITranslationInfo = await createUserAITranslationInfo(
		currentUserId,
		pageId,
		targetLocale,
		"gemini-1.5-flash",
	);
	const pageAITranslationInfo = await createPageAITranslationInfo(
		pageId,
		targetLocale,
	);

	const pageWithPageSegments = await fetchPageWithPageSegments(pageId);
	if (!pageWithPageSegments) {
		throw new Error("Page with page segments not found");
	}

	const jobParams: TranslateJobParams = {
		userAITranslationInfoId: userAITranslationInfo.id,
		pageAITranslationInfoId: pageAITranslationInfo.id,
		geminiApiKey: geminiApiKey,
		aiModel: "gemini-1.5-flash",
		userId: currentUserId,
		pageId: pageId,
		targetLocale,
		title: pageWithPageSegments.title,
		numberedElements: pageWithPageSegments.pageSegments.map((st) => ({
			number: st.number,
			text: st.text,
		})),
		translateTarget: TranslateTarget.TRANSLATE_PAGE,
	};

	await fetch(`${BASE_URL}/api/translate`, {
		method: "POST",
		body: JSON.stringify(jobParams),
	});
}
