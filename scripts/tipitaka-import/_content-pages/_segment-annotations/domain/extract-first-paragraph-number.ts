/**
 * 段落番号のパターン: 数字にドット（例: "123." または "123\."）
 * エスケープされたドット（\.）にも対応
 */
const PARAGRAPH_NUMBER_REGEX = /(\d+)(?:\.|\\.)/g;

/**
 * セグメントのテキストから最初の段落番号を抽出する
 */
export function extractFirstParagraphNumber(text: string): string | null {
	PARAGRAPH_NUMBER_REGEX.lastIndex = 0;
	const match = PARAGRAPH_NUMBER_REGEX.exec(text);
	if (match?.[1]) {
		return match[1];
	}
	return null;
}
