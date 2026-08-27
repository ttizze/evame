/** 翻訳済みセグメント数をジョブの表示用パーセントへ変換する。 */
export function calculateTranslationProgress(
	translatedCount: number,
	total: number,
): number {
	if (!Number.isSafeInteger(translatedCount) || translatedCount < 0) return 0;
	if (!Number.isSafeInteger(total) || total <= 0) return 100;
	return Math.min(
		100,
		Math.floor((Math.min(translatedCount, total) * 100) / total),
	);
}

export function isTranslationComplete(
	translatedCount: number,
	total: number,
): boolean {
	return total <= 0 || translatedCount >= total;
}
