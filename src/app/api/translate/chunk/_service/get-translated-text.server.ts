import { supportedLocaleOptions } from "@/app/_constants/locale";
import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentElement } from "../../types";
import {
	fetchGeminiApiKeyByUserId,
	fetchUserPlanByUserId,
} from "../_db/queries.server";
import { getDeepSeekModelResponse } from "../_infra/deepseek";
import { getGeminiModelResponse } from "../_infra/gemini";
import { getOpenAIModelResponse } from "../_infra/openai";
import { getVertexAIModelResponse } from "../_infra/vertexai";
import { getProviderFromModel } from "./get-provider-from-model";

const logger = createServerLogger("translate-chunk");

export async function getTranslatedText(
	userId: string,
	aiModel: string,
	segments: SegmentElement[],
	targetLocale: string,
	title: string,
	translationContext: string,
) {
	// AIに送るのは number と text のペアのみ（id は不要）
	const sourceText = segments
		.map((seg) => JSON.stringify({ number: seg.number, text: seg.text }))
		.join("\n");
	const targetLocaleName =
		supportedLocaleOptions.find((sl) => sl.code === targetLocale)?.name ||
		targetLocale;

	// ユーザーIDからプラン情報を取得
	const userPlan = await fetchUserPlanByUserId(userId);

	// モデル名からproviderを判定
	const provider = getProviderFromModel(aiModel, userPlan ?? undefined);

	if (provider === "gemini") {
		const geminiApiKey = await fetchGeminiApiKeyByUserId(userId);
		if (!geminiApiKey || geminiApiKey === "undefined") {
			throw new Error(
				"Gemini API key is not set. Page will not be translated.",
			);
		}
		return await getGeminiModelResponse({
			geminiApiKey,
			model: aiModel,
			title,
			sourceText,
			targetLocale: targetLocaleName,
			translationContext,
		});
	}

	if (provider === "openai") {
		const openaiApiKey = process.env.OPENAI_API_KEY;
		if (!openaiApiKey) {
			throw new Error(
				"OPENAI_API_KEY environment variable is not set. Page will not be translated.",
			);
		}
		return await getOpenAIModelResponse({
			apiKey: openaiApiKey,
			model: aiModel,
			title,
			sourceText,
			targetLocale: targetLocaleName,
			translationContext,
		});
	}

	if (provider === "deepseek") {
		const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
		if (!deepseekApiKey) {
			logger.error("DEEPSEEK_API_KEY not found in environment");
			throw new Error(
				"DEEPSEEK_API_KEY environment variable is not set. Page will not be translated.",
			);
		}
		return await getDeepSeekModelResponse({
			apiKey: deepseekApiKey,
			model: aiModel,
			title,
			sourceText,
			targetLocale: targetLocaleName,
			translationContext,
		});
	}

	// default Vertex AI
	return await getVertexAIModelResponse({
		model: aiModel,
		title,
		sourceText,
		targetLocale: targetLocaleName,
		translationContext,
	});
}
