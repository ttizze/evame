/**
 * ディレクトリパスから最後のセグメントを取得する
 *
 * @param dirPath - ディレクトリパス（例: "01-sutta/02-diggha-nikaya"）
 * @returns 最後のセグメント
 *
 * @example
 * getLastSegment("01-sutta/02-diggha-nikaya") // => "02-diggha-nikaya"
 * getLastSegment("01-sutta") // => "01-sutta"
 */
export function getLastSegment(dirPath: string): string {
	const segments = dirPath.split("/");
	return segments[segments.length - 1] ?? "";
}
