/**
 * fileKeyから順序を抽出する（例: "s0101m.mul.xml" → 101）
 */
export function extractOrderFromFileKey(fileKey: string): number {
	const match = fileKey.match(/\d+/);
	if (!match) return Number.MAX_SAFE_INTEGER;
	return Number.parseInt(match[0], 10);
}
