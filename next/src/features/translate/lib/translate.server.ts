import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { TranslationStatus } from "@prisma/client";
import { updateTranslationJob } from "../db/mutations.server";
import { getLatestPageCommentSegments } from "../db/queries.server";
import {
	getLatestPageSegments,
	getLatestProjectSegments,
} from "../db/queries.server";
import { getGeminiModelResponse } from "../services/gemini";
import type { NumberedElement, TranslateJobParams } from "../types";
import { extractTranslations } from "./extract-translations.server";
import {
	saveTranslationsForComment,
	saveTranslationsForPage,
	saveTranslationsForProject,
} from "./io-deps";
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

		for (let i = 0; i < chunks.length; i++) {
			console.log(`Processing chunk ${i + 1} of ${totalChunks}`);
			console.log(chunks[i]);
			await translateChunk(
				params.geminiApiKey,
				params.aiModel,
				chunks[i],
				params.targetLocale,
				params.pageId,
				params.projectId,
				params.title,
				params.targetContentType,
				params.commentId,
			);
			const progress = ((i + 1) / totalChunks) * 100;
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
	geminiApiKey: string,
	aiModel: string,
	numberedElements: NumberedElement[],
	targetLocale: string,
	pageId?: number,
	projectId?: string,
	title?: string,
	targetContentType?: TargetContentType,
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
			targetLocale,
			title || "",
		);

		// extractTranslationsでJSONパースを試し、失敗時は正規表現抽出
		const partialTranslations = extractTranslations(translatedText);

		if (partialTranslations.length > 0) {
			// 部分的にでも取得できた翻訳結果を保存
			if (targetContentType === "page") {
				if (!pageId) {
					throw new Error("Page ID is required");
				}
				const pageSegments = await getLatestPageSegments(pageId);

				await saveTranslationsForPage(
					partialTranslations,
					pageSegments,
					targetLocale,
					aiModel,
				);
			} else if (targetContentType === "comment") {
				// コメント用の保存先テーブル or ロジック
				if (!commentId || !pageId) {
					throw new Error("Comment ID is required");
				}
				const pageCommentSegments =
					await getLatestPageCommentSegments(pageId, commentId);
				await saveTranslationsForComment(
					partialTranslations,
					pageCommentSegments,
					targetLocale,
					aiModel,
				);
			} else if (targetContentType === "project") {
				if (!projectId) {
					throw new Error("Project ID is required");
				}
				const projectSegments = await getLatestProjectSegments(projectId);
				await saveTranslationsForProject(partialTranslations, projectSegments, targetLocale, aiModel);
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
	targetLocale: string,
	title: string,
) {
	const source_text = numberedElements
		.map((el) => JSON.stringify(el))
		.join("\n");
	const targetLocaleName =
		supportedLocaleOptions.find((sl) => sl.code === targetLocale)?.name ||
		targetLocale;
	const result = await getGeminiModelResponse(
		geminiApiKey,
		aiModel,
		title,
		source_text,
		targetLocaleName,
	);
	return result;
}
