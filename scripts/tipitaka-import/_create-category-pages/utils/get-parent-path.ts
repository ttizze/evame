/**
 * ディレクトリパスから親パスを取得する
 *
 * @param dirPath - ディレクトリパス（例: "01-sutta/02-diggha-nikaya"）
 * @returns 親パス。ルートの場合は空文字列を返す
 *
 * @example
 * getParentPath("01-sutta/02-diggha-nikaya") // => "01-sutta"
 * getParentPath("01-sutta") // => ""
 * getParentPath("") // => ""
 */
export function getParentPath(dirPath: string): string {
	if (!dirPath) return "";
	const segments = dirPath.split("/");
	return segments.slice(0, -1).join("/");
}
