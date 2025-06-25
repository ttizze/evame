import { MAX_CHUNK_SIZE } from '../constants';
import type { NumberedElement } from '../types';

export function splitNumberedElements(
  elements: NumberedElement[]
): NumberedElement[][] {
  const chunks: NumberedElement[][] = [];
  let currentChunk: NumberedElement[] = [];
  let currentSize = 0;

  for (const element of elements) {
    if (
      currentSize + element.text.length > MAX_CHUNK_SIZE &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(element);
    currentSize += element.text.length;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}
