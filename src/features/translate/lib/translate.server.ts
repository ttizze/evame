import { TranslationStatus } from "@prisma/client";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import {
	ensurePageLocaleTranslationProof,
	updateTranslationJob,
} from "../db/mutations.server";
import {
	fetchGeminiApiKeyByUserId,
	getPageCommentSegments,
	getPageSegments,
} from "../db/queries.server";
import { getGeminiModelResponse } from "../services/gemini";
import { getVertexAIModelResponse } from "../services/vertexai";
import type {
	NumberedElement,
	TranslateJobParams,
	TranslationProvider,
} from "../types";
import { extractTranslations } from "./extract-translations.server";
import { saveTranslations } from "./io-deps";
import { splitNumberedElements } from "./split-numbered-elements.server";

export async function translate(params: TranslateJobParams) {
	try {
		await updateTranslationJob(
			params.translationJobId,
			TranslationStatus.IN_PROGRESS,
			0,
		);
		const sortedNumberedElements = params.numberedElements.sort(
			(a, b) => a.number - b.number,
		);
		const chunks = splitNumberedElements(sortedNumberedElements);
		const totalChunks = chunks.length;

		for (const [index, chunk] of chunks.entries()) {
			console.log(`Processing chunk ${index + 1} of ${totalChunks}`);
			await translateChunk(
				params.userId,
				params.provider,
				params.aiModel,
				chunk,
				params.targetLocale,
				params.pageId,
				params.title,
				params.pageCommentId,
			);
			const progress = ((index + 1) / totalChunks) * 100;
			await updateTranslationJob(
				params.translationJobId,
				TranslationStatus.IN_PROGRESS,
				progress,
			);
		}
		await updateTranslationJob(
			params.translationJobId,
			TranslationStatus.COMPLETED,
			100,
		);
	} catch (error) {
		console.error("Background translation job failed:", error);
		await updateTranslationJob(
			params.translationJobId,
			TranslationStatus.FAILED,
			0,
		);
	}
}

async function translateChunk(
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
			const pageSegments = await getPageSegments(pageId);

			await saveTranslations(
				partialTranslations,
				pageSegments,
				targetLocale,
				aiModel,
			);
			await ensurePageLocaleTranslationProof(pageId, targetLocale);

			if (pageCommentId) {
				const segments = await getPageCommentSegments(pageCommentId);
				await saveTranslations(
					partialTranslations,
					segments,
					targetLocale,
					aiModel,
				);
			}
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
