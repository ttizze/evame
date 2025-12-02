/**
 * ディレクトリセグメント配列からカテゴリページIDを取得する
 */
export function findCategoryPageIdFromDirSegments(
	dirSegments: string[],
	categoryPageLookup: Map<string, number>,
): number {
	const dirPath = dirSegments.length === 0 ? "" : dirSegments.join("/");
	const categoryPageId = categoryPageLookup.get(dirPath);
	if (typeof categoryPageId !== "number") {
		throw new Error(`Category page not found for path: ${dirPath || "(root)"}`);
	}
	return categoryPageId;
}
