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

/** 旧Evameと同じく、チャンク単位で100を分配する。 */
export function stepForChunk(totalChunks: number, chunkIndex: number): number {
	if (
		!Number.isSafeInteger(totalChunks) ||
		totalChunks <= 0 ||
		!Number.isSafeInteger(chunkIndex) ||
		chunkIndex < 0 ||
		chunkIndex >= totalChunks
	) {
		return 0;
	}
	const base = Math.floor(100 / totalChunks);
	return base + (chunkIndex < 100 % totalChunks ? 1 : 0);
}

/** 完了済みチャンクから順不同・再配信込みで表示進捗を再計算する。 */
export function calculateChunkProgress(
	totalChunks: number,
	completedChunkIndices: readonly number[],
): number {
	if (!Number.isSafeInteger(totalChunks) || totalChunks <= 0) return 100;
	const completed = new Set(completedChunkIndices);
	let progress = 0;
	for (const chunkIndex of completed) {
		progress += stepForChunk(totalChunks, chunkIndex);
	}
	return Math.min(100, progress);
}
