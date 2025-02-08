import { TranslationIntent } from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import { supportedLocaleOptions } from "@/app/constants/locale";
import { TranslationStatus } from "@prisma/client";
import { updateUserAITranslationInfo } from "../db/mutations.server";
import { getLatestPageCommentSegments } from "../db/query.server";
import { getLatestPageSegments } from "../db/query.server";
import { getGeminiModelResponse } from "../services/gemini";
import type { NumberedElement, TranslateJobParams } from "../types";
import { extractTranslations } from "./extract-translations.server";
import { saveTranslationsForComment, saveTranslationsForPage } from "./io-deps";
import { splitNumberedElements } from "./split-numbered-elements.server";

export async function translate(params: TranslateJobParams) {
	try {
		await updateUserAITranslationInfo(
			params.userAITranslationInfoId,
			TranslationStatus.IN_PROGRESS,
			0,
		);
		const sortedNumberedElements = params.numberedElements.sort(
			(a, b) => a.number - b.number,
		);
		const chunks = splitNumberedElements(sortedNumberedElements);
		const totalChunks = chunks.length;

		for (let i = 0; i < chunks.length; i++) {
			console.log(`Processing chunk ${i + 1} of ${totalChunks}`);
			console.log(chunks[i]);

			await translateChunk(
				params.geminiApiKey,
				params.aiModel,
				chunks[i],
				params.locale,
				params.pageId,
				params.title,
				params.translationIntent,
				params.commentId,
			);
			const progress = ((i + 1) / totalChunks) * 100;
			await updateUserAITranslationInfo(
				params.userAITranslationInfoId,
				TranslationStatus.IN_PROGRESS,
				progress,
			);
		}
		await updateUserAITranslationInfo(
			params.userAITranslationInfoId,
			TranslationStatus.COMPLETED,
			100,
		);
	} catch (error) {
		console.error("Background translation job failed:", error);
		await updateUserAITranslationInfo(
			params.userAITranslationInfoId,
			TranslationStatus.FAILED,
			0,
		);
	}
}

async function translateChunk(
	geminiApiKey: string,
	aiModel: string,
	numberedElements: NumberedElement[],
	locale: string,
	pageId: number,
	title: string,
	translationIntent: TranslationIntent,
	commentId?: number,
) {
	// まだ翻訳が完了していない要素
	let pendingElements = [...numberedElements];
	const maxRetries = 3;
	let attempt = 0;

	// 全部翻訳が終わるか、リトライ上限まで試す
	while (pendingElements.length > 0 && attempt < maxRetries) {
		attempt++;

		const translatedText = await getTranslatedText(
			geminiApiKey,
			aiModel,
			pendingElements,
			locale,
			title,
		);

		// extractTranslationsでJSONパースを試し、失敗時は正規表現抽出
		const partialTranslations = extractTranslations(translatedText);

		if (partialTranslations.length > 0) {
			// 部分的にでも取得できた翻訳結果を保存
			if (translationIntent === TranslationIntent.TRANSLATE_PAGE) {
				const pageSegments = await getLatestPageSegments(pageId);

				await saveTranslationsForPage(
					partialTranslations,
					pageSegments,
					locale,
					aiModel,
				);
			} else {
				// コメント用の保存先テーブル or ロジック
				if (!commentId) {
					throw new Error("Comment ID is required");
				}
				const pageCommentSegments =
					await getLatestPageCommentSegments(commentId);
				await saveTranslationsForComment(
					partialTranslations,
					pageCommentSegments,
					locale,
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
	geminiApiKey: string,
	aiModel: string,
	numberedElements: NumberedElement[],
	locale: string,
	title: string,
) {
	const source_text = numberedElements
		.map((el) => JSON.stringify(el))
		.join("\n");
	const localeName =
		supportedLocaleOptions.find((sl) => sl.code === locale)?.name || locale;
	return getGeminiModelResponse(
		geminiApiKey,
		aiModel,
		title,
		source_text,
		localeName,
	);
}
