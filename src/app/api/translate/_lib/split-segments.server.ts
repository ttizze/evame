import { MAX_CHUNK_SIZE } from "../constants";
import type { SegmentElement } from "../types";

/** セグメントを MAX_CHUNK_SIZE 以下のチャンクに分割 */
export function splitSegments(segments: SegmentElement[]): SegmentElement[][] {
	const chunks: SegmentElement[][] = [];
	let currentChunk: SegmentElement[] = [];
	let currentSize = 0;

	for (const segment of segments) {
		if (
			currentSize + segment.text.length > MAX_CHUNK_SIZE &&
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
