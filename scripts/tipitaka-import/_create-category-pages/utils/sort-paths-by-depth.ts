/**
 * パス配列を深さ（階層の深さ）とアルファベット順でソートする
 *
 * 親パスが子パスよりも先に来るようにソートします。
 * 同じ深さのパスはアルファベット順でソートされます。
 *
 * @param paths - ソートするパスのセットまたは配列
 * @returns ソートされたパスの配列
 *
 * @example
 * sortPathsByDepth(["01-sutta/02-diggha", "01-sutta", "02-vinaya"])
 * // => ["01-sutta", "02-vinaya", "01-sutta/02-diggha"]
 */
export function sortPathsByDepth(paths: Set<string> | string[]): string[] {
	const pathArray = Array.isArray(paths) ? paths : Array.from(paths);
	return pathArray.sort((a, b) => {
		const aDepth = a.split("/").length;
		const bDepth = b.split("/").length;
		if (aDepth !== bDepth) return aDepth - bDepth;
		return a.localeCompare(b);
	});
}
