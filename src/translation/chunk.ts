import type { TranslationSegment } from "./types";

const DEFAULT_MAX_CHUNK_SIZE = 10_000;

// 既存Evameのプロバイダー別出力上限に合わせる。未知のモデルは安全側の既定値を使う。
const MODEL_MAX_CHUNK_SIZES: Readonly<Record<string, number>> = {
	"gpt-5-nano-2025-08-07": 30_000,
	"deepseek-reasoner": 30_000,
	"deepseek-chat": 30_000,
	"gemini-2.5-flash": 30_000,
	"gemini-2.5-flash-lite": 30_000,
	"gemini-2.0-flash": 10_000,
};

export function getMaxChunkSizeForModel(model: string): number {
	return MODEL_MAX_CHUNK_SIZES[model] ?? DEFAULT_MAX_CHUNK_SIZE;
}

/** セグメントの順序を維持し、各チャンクの原文文字数をモデル上限以下に収める。 */
export function splitTranslationSegments(
	segments: readonly TranslationSegment[],
	model: string,
): TranslationSegment[][] {
	const maxChunkSize = getMaxChunkSizeForModel(model);
	const chunks: TranslationSegment[][] = [];
	let current: TranslationSegment[] = [];
	let currentSize = 0;

	for (const segment of segments) {
		if (
			current.length > 0 &&
			currentSize + segment.text.length > maxChunkSize
		) {
			chunks.push(current);
			current = [];
			currentSize = 0;
		}

		current.push(segment);
		currentSize += segment.text.length;
	}

	if (current.length > 0) chunks.push(current);
	return chunks;
}
