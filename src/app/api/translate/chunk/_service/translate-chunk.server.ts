import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentElement } from "../../types";
import { ensurePageLocaleTranslationProof } from "../_db/mutations.server";
import { extractTranslations } from "../_domain/extract-translations";
import { getTranslatedText } from "./get-translated-text.server";
import { saveTranslations } from "./save-translations.server";

const logger = createServerLogger("translate-chunk");

export async function translateChunk(
	userId: string,
	aiModel: string,
	segments: SegmentElement[],
	targetLocale: string,
	pageId: number,
	title: string,
	translationContext: string,
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
			aiModel,
			pendingSegments,
			targetLocale,
			title,
			translationContext,
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
			logger.error("今回の試行では翻訳を抽出できませんでした。");
			// 部分的な翻訳が全く得られなかった場合でもリトライ回数以内なら繰り返す
		}
	}

	if (pendingSegments.length > 0) {
		// リトライ回数超過後も未翻訳要素が残っている場合はエラー処理
		logger.error(
			{ pending_count: pendingSegments.length },
			"一部要素は翻訳できませんでした",
		);
		throw new Error("部分的な翻訳のみ完了し、残存要素は翻訳失敗しました。");
	}
}
