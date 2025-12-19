import { getMaxChunkSizeForModel } from "../constants";
import type { SegmentElement } from "../types";

/** セグメントをモデル別の最大チャンクサイズ以下のチャンクに分割 */
export function splitSegments(
	segments: SegmentElement[],
	model: string,
): SegmentElement[][] {
	const maxChunkSize = getMaxChunkSizeForModel(model);
	const chunks: SegmentElement[][] = [];
	let currentChunk: SegmentElement[] = [];
	let currentSize = 0;

	for (const segment of segments) {
		if (
			currentSize + segment.text.length > maxChunkSize &&
			currentChunk.length > 0
		) {
			chunks.push(currentChunk);
			currentChunk = [];
			currentSize = 0;
		}
		currentChunk.push(segment);
		currentSize += segment.text.length;
	}

	if (currentChunk.length > 0) {
		chunks.push(currentChunk);
	}
	return chunks;
}
