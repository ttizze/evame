/**
 * 正規化されたキーからCOMMENTARYセグメントタイプのlabelを生成する
 * 最初の文字を大文字、残りを小文字に変換
 * @example "ATTHAKATHA" -> "Atthakatha"
 */
export function formatCommentaryLabel(normalizedKey: string): string {
	return normalizedKey.charAt(0) + normalizedKey.slice(1).toLowerCase();
}
