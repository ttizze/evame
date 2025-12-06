import { supportedLocaleOptions } from "@/app/_constants/locale";
import { ensurePageLocaleTranslationProof } from "../_db/mutations.server";
import { fetchGeminiApiKeyByUserId } from "../_db/queries.server";
import { getGeminiModelResponse } from "../_services/gemini";
import { getVertexAIModelResponse } from "../_services/vertexai";
import type { SegmentElement, TranslationProvider } from "../types";
import { extractTranslations } from "./extract-translations.server";
import { saveTranslations } from "./save-translations.server";

export async function translateChunk(
	userId: string,
	provider: TranslationProvider,
	aiModel: string,
	segments: SegmentElement[],
	targetLocale: string,
	pageId: number,
	title: string,
) {
	// まだ翻訳が完了していないセグメント
	let pendingSegments = [...segments];
	const maxRetries = 3;
	let attempt = 0;

	// 全部翻訳が終わるか、リトライ上限まで試す
	while (pendingSegments.length > 0 && attempt < maxRetries) {
		attempt++;

		const translatedText = await getTranslatedText(
			userId,
			provider,
			aiModel,
			pendingSegments,
			targetLocale,
			title,
		);

		// extractTranslationsでJSONパースを試し、失敗時は正規表現抽出
		const partialTranslations = extractTranslations(translatedText);

		if (partialTranslations.length > 0) {
			await saveTranslations(
				partialTranslations,
				pendingSegments,
				targetLocale,
				aiModel,
			);

			await ensurePageLocaleTranslationProof(pageId, targetLocale);
			// 成功した要素をpendingSegmentsから除去
			const translatedNumbers = new Set(
				partialTranslations.map((e) => e.number),
			);
			pendingSegments = pendingSegments.filter(
				(seg) => !translatedNumbers.has(seg.number),
			);
		} else {
			console.error("今回の試行では翻訳を抽出できませんでした。");
			// 部分的な翻訳が全く得られなかった場合でもリトライ回数以内なら繰り返す
		}
	}

	if (pendingSegments.length > 0) {
		// リトライ回数超過後も未翻訳要素が残っている場合はエラー処理
		console.error("一部要素は翻訳できませんでした:", pendingSegments);
		throw new Error("部分的な翻訳のみ完了し、残存要素は翻訳失敗しました。");
	}
}

async function getTranslatedText(
	userId: string,
	provider: TranslationProvider,
	aiModel: string,
	segments: SegmentElement[],
	targetLocale: string,
	title: string,
) {
	// AIに送るのは number と text のペアのみ（id は不要）
	const source_text = segments
		.map((seg) => JSON.stringify({ number: seg.number, text: seg.text }))
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
