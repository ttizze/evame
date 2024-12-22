import { prisma } from "../../../utils/prisma";
import { updateUserAITranslationInfo } from "../functions/mutations.server";
import { getOrCreateAIUser } from "../functions/mutations.server";
import { getLatestSourceTexts } from "../functions/mutations.server";
import { getGeminiModelResponse } from "../services/gemini";
import type { NumberedElement } from "../types";
import type { TranslateJobParams } from "../types";
import { extractTranslations } from "../utils/extractTranslations.server";
import { splitNumberedElements } from "../utils/splitNumberedElements.server";

export async function translate(params: TranslateJobParams) {
	try {
		await updateUserAITranslationInfo(
			params.userAITranslationInfoId,
			"in_progress",
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
			);
			const progress = ((i + 1) / totalChunks) * 100;
			await updateUserAITranslationInfo(
				params.userAITranslationInfoId,
				"in_progress",
				progress,
			);
		}
		await updateUserAITranslationInfo(
			params.userAITranslationInfoId,
			"completed",
			100,
		);
	} catch (error) {
		console.error("Background translation job failed:", error);
		await updateUserAITranslationInfo(
			params.userAITranslationInfoId,
			"failed",
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
) {
	const sourceTexts = await getLatestSourceTexts(pageId);

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
			await saveTranslations(partialTranslations, sourceTexts, locale, aiModel);
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
	return getGeminiModelResponse(
		geminiApiKey,
		aiModel,
		title,
		source_text,
		locale,
	);
}

async function saveTranslations(
	extractedTranslations: NumberedElement[],
	sourceTexts: { id: number; number: number }[],
	locale: string,
	aiModel: string,
) {
	const systemUserId = await getOrCreateAIUser(aiModel);

	const translationData = extractedTranslations
		.map((translation) => {
			const sourceTextId = sourceTexts.find(
				(sourceText) => sourceText.number === translation.number,
			)?.id;
			if (!sourceTextId) {
				console.error(
					`Source text ID not found for translation number ${translation.number} ${translation.text}`,
				);
				return null;
			}
			return {
				locale,
				text: translation.text,
				sourceTextId,
				userId: systemUserId,
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);

	if (translationData.length > 0) {
		await prisma.translateText.createMany({ data: translationData });
	}
}
