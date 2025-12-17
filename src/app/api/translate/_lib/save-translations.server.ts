import { db } from "@/db";
import { getOrCreateAIUser } from "../_db/mutations.server";
import type { SegmentElement, TranslatedElement } from "../types";

/**
 * 翻訳結果(extracted)とセグメント(segments)を突き合わせて
 * DB保存用データを作成する
 */
function buildData(
	extracted: readonly TranslatedElement[],
	segments: readonly SegmentElement[],
	locale: string,
	userId: string,
) {
	const map = new Map(segments.map((s) => [s.number, s.id]));

	return extracted.flatMap((el) => {
		const segmentId = map.get(el.number);
		if (!segmentId) {
			console.error(`segment #${el.number} not found (${el.text})`);
			return [];
		}
		return [{ locale, text: el.text, userId, segmentId }];
	});
}

export async function saveTranslations(
	extracted: TranslatedElement[],
	segments: SegmentElement[],
	locale: string,
	aiModel: string,
) {
	const userId = await getOrCreateAIUser(aiModel);
	const data = buildData(extracted, segments, locale, userId);
	if (data.length) {
		await db.insertInto("segmentTranslations").values(data).execute();
	}
}
