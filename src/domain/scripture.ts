import { InvalidInputError } from "./errors";

export type ScriptureHierarchyRow = {
	id: number;
	title: string;
	parent_id: number | null;
};

/** 公開経典の親をたどり、表示用のルートから現在位置までの題名を返す。 */
export function buildScriptureHierarchy(
	current: ScriptureHierarchyRow,
	rows: readonly ScriptureHierarchyRow[],
): string[] {
	const rowsById = new Map(rows.map((row) => [row.id, row]));
	const hierarchy: string[] = [];
	const visited = new Set<number>();
	let row: ScriptureHierarchyRow | undefined = current;

	while (row) {
		if (visited.has(row.id)) {
			throw new InvalidInputError("経典階層に循環参照があります");
		}
		visited.add(row.id);
		hierarchy.unshift(row.title);
		row = row.parent_id === null ? undefined : rowsById.get(row.parent_id);
	}

	return hierarchy;
}
