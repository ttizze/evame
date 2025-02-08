"use server";
import { fetchGeminiApiKeyByHandle } from "@/app/db/queries.server";
import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { getTranslateUserQueue } from "@/features/translate/translate-user-queue";
import { z } from "zod";
import { TranslationIntent } from "../../constants";
import { createUserAITranslationInfo } from "../../db/mutations.server";
import { fetchPageWithPageSegments } from "../../db/queries.server";

const translateSchema = z.object({
	pageId: z.number(),
	aiModel: z.string().min(1, "モデルを選択してください"),
	locale: z.string().min(1, "localeを選択してください"),
	intent: z.enum([
		TranslationIntent.TRANSLATE_PAGE,
		TranslationIntent.TRANSLATE_COMMENT,
	]),
});

export type PageTranslateActionState = ActionState & {
	fieldErrors?: {
		pageId?: string[];
		aiModel?: string[];
		locale?: string[];
		intent?: string[];
	};
};

export async function pageTranslateAction(
	previousState: PageTranslateActionState,
	formData: FormData,
) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { generalError: "Unauthorized" };
	}

	const validate = translateSchema.safeParse({
		pageId: formData.get("pageId"),
		aiModel: formData.get("aiModel"),
	});
	if (!validate.success) {
		return { fieldErrors: validate.error.flatten().fieldErrors };
	}
	const geminiApiKey = await fetchGeminiApiKeyByHandle(currentUser.handle);
	if (!geminiApiKey) {
		throw new Response("Gemini API key is not set", { status: 404 });
	}

	const pageWithPageSegments = await fetchPageWithPageSegments(
		validate.data.pageId,
	);
	if (!pageWithPageSegments) {
		return {
			generalError: "Page not found",
		};
	}

	const numberedElements = pageWithPageSegments.pageSegments.map((item) => ({
		number: item.number,
		text: item.text,
	}));
	const userAITranslationInfo = await createUserAITranslationInfo(
		currentUser.id,
		pageWithPageSegments.id,
		validate.data.aiModel,
		validate.data.locale,
	);

	const queue = getTranslateUserQueue(currentUser.id);
	await queue.add(`translate-${currentUser.id}`, {
		userAITranslationInfoId: userAITranslationInfo.id,
		geminiApiKey: geminiApiKey.apiKey,
		aiModel: validate.data.aiModel,
		userId: currentUser.id,
		pageId: pageWithPageSegments.id,
		locale: validate.data.locale,
		title: pageWithPageSegments.title,
		numberedElements: numberedElements,
		translationIntent: validate.data.intent,
	});
	return {
		success: "Translation started",
	};
}
