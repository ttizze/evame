import { supportedLocaleOptions } from "@/app/_constants/locale";
import { ensurePageLocaleTranslationProof } from "../_db/mutations.server";
import {
	fetchGeminiApiKeyByUserId,
	getPageCommentSegments,
	getPageSegments,
} from "../_db/queries.server";
import { getGeminiModelResponse } from "../_services/gemini";
import { getVertexAIModelResponse } from "../_services/vertexai";
import type { NumberedElement, TranslationProvider } from "../types";
import { extractTranslations } from "./extract-translations.server";
import { saveTranslations } from "./io-deps";

export async function translateChunk(
	userId: string,
	provider: TranslationProvider,
	aiModel: string,
	numberedElements: NumberedElement[],
	targetLocale: string,
	pageId: number,
	title?: string,
	pageCommentId?: number,
) {
	// まだ翻訳が完了していない要素
	let pendingElements = [...numberedElements];
	const maxRetries = 3;
	let attempt = 0;

	// 全部翻訳が終わるか、リトライ上限まで試す
	while (pendingElements.length > 0 && attempt < maxRetries) {
		attempt++;

		const translatedText = await getTranslatedText(
			userId,
			provider,
			aiModel,
			pendingElements,
			targetLocale,
			title || "",
		);

		// extractTranslationsでJSONパースを試し、失敗時は正規表現抽出
		const partialTranslations = extractTranslations(translatedText);

		if (partialTranslations.length > 0) {
			// セグメント取得と翻訳保存を統一的に処理
			const segments = pageCommentId
				? await getPageCommentSegments(pageCommentId)
				: await getPageSegments(pageId);

			await saveTranslations(
				partialTranslations,
				segments,
				targetLocale,
				aiModel,
			);

			await ensurePageLocaleTranslationProof(pageId, targetLocale);
			// 成功した要素をpendingElementsから除去
			const translatedNumbers = new Set(
				partialTranslations.map((e) => e.number),
			);
			pendingElements = pendingElements.filter(
				(el) => !translatedNumbers.has(el.number),
			);
		} else {
			console.error("今回の試行では翻訳を抽出できませんでした。");
			// 部分的な翻訳が全く得られなかった場合でもリトライ回数以内なら繰り返す
		}
	}

	if (pendingElements.length > 0) {
		// リトライ回数超過後も未翻訳要素が残っている場合はエラー処理
		console.error("一部要素は翻訳できませんでした:", pendingElements);
		throw new Error("部分的な翻訳のみ完了し、残存要素は翻訳失敗しました。");
	}
}

async function getTranslatedText(
	userId: string,
	provider: TranslationProvider,
	aiModel: string,
	numberedElements: NumberedElement[],
	targetLocale: string,
	title: string,
) {
	const source_text = numberedElements
		.map((el) => JSON.stringify(el))
		.join("\n");
	const targetLocaleName =
		supportedLocaleOptions.find((sl) => sl.code === targetLocale)?.name ||
		targetLocale;

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
			source_text,
			target_locale: targetLocaleName,
		});
	}

	// default Vertex AI
	return await getVertexAIModelResponse(
		aiModel,
		title,
		source_text,
		targetLocaleName,
	);
}
