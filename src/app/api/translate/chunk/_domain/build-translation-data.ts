import type { SegmentElement, TranslatedElement } from "../../types";

/**
 * 翻訳結果(extracted)とセグメント(segments)を突き合わせて
 * DB保存用データを作成する
 */
export function buildTranslationData(
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
