import type { JsonValue } from "@/db/types";

type MdastNode = Record<string, unknown>;
type MdastRoot = { type: "root"; children: JsonValue[] } & MdastNode;

// ここでは「境界の抽出 / slice」だけを担当する。
// 「分割するかどうか（しきい値などのポリシー）」は呼び出し側で判断する。

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getRoot(mdastJson: JsonValue): MdastRoot | null {
	if (!isObject(mdastJson)) return null;
	if (mdastJson.type !== "root") return null;
	const children = (mdastJson as Record<string, unknown>).children;
	if (!Array.isArray(children)) return null;
	return {
		...(mdastJson as MdastNode),
		type: "root",
		children: children as JsonValue[],
	};
}

function getHeadingIndexes(children: JsonValue[]): number[] {
	// mdast.children のうち `###` 見出し（heading depth=3）になっている要素の index を集める。
	const indexes: number[] = [];
	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		if (!isObject(node)) continue;
		if (node.type !== "heading") continue;
		if (node.depth !== 3) continue;
		indexes.push(i);
	}
	return indexes;
}

function collectSegmentNumbersFromNode(
	node: unknown,
	numbers: Set<number>,
): void {
	if (!isObject(node)) return;
	const data = node.data;
	if (isObject(data)) {
		const hProperties = data.hProperties;
		if (isObject(hProperties)) {
			const raw =
				hProperties["data-number-id"] ??
				hProperties.dataNumberId ??
				hProperties.dataNumberID;
			const n = typeof raw === "number" ? raw : Number(raw);
			if (Number.isFinite(n)) numbers.add(n);
		}
	}

	const children = (node as Record<string, unknown>).children;
	if (Array.isArray(children)) {
		for (const child of children) collectSegmentNumbersFromNode(child, numbers);
	}
}

function collectSegmentNumbersFromSubtree(node: unknown): Set<number> {
	const numbers = new Set<number>();
	collectSegmentNumbersFromNode(node, numbers);
	return numbers;
}

function getSectionStartIndexes(children: JsonValue[]): number[] {
	// boundaries は「各 section の開始 index」。section=0 は必ず 0。
	const boundaries = [0, ...getHeadingIndexes(children)].filter(
		(v, i, a) => i === 0 || v !== a[i - 1],
	);
	return boundaries;
}

function getSectionStartIndexesBySegmentCount(
	children: JsonValue[],
	segmentCountPerSection: number,
): number[] {
	const safeCount = Number.isFinite(segmentCountPerSection)
		? Math.max(1, Math.floor(segmentCountPerSection))
		: 1;
	const boundaries = [0];
	let sectionNumbers = new Set<number>();

	for (let i = 0; i < children.length; i++) {
		const nodeNumbers = collectSegmentNumbersFromSubtree(children[i]);
		for (const n of nodeNumbers) sectionNumbers.add(n);

		if (sectionNumbers.size >= safeCount && i + 1 < children.length) {
			boundaries.push(i + 1);
			sectionNumbers = new Set<number>();
		}
	}

	return boundaries;
}

export function sliceMdastSection(
	mdastJson: JsonValue,
	sectionIndex: number,
): { mdast: JsonValue; totalSections: number; hasMore: boolean } {
	// mdastJson 全体から「指定 section の children 範囲」だけを root 付きで切り出す。
	//
	// starts=[0, b1, b2, ...] のとき:
	// - section=0 => children.slice(0, b1)
	// - section=1 => children.slice(b1, b2)
	// - ...
	const root = getRoot(mdastJson);
	if (!root) {
		return {
			mdast: { type: "root", children: [] as JsonValue[] },
			totalSections: 1,
			hasMore: false,
		};
	}

	const boundaries = getSectionStartIndexes(root.children);
	const totalSections = boundaries.length;
	const safeSection = Number.isFinite(sectionIndex)
		? Math.max(0, sectionIndex)
		: 0;

	if (safeSection >= totalSections) {
		return {
			mdast: { type: "root", children: [] as JsonValue[] },
			totalSections,
			hasMore: false,
		};
	}

	const start = boundaries[safeSection] ?? 0;
	const end = boundaries[safeSection + 1] ?? root.children.length;
	const hasMore = safeSection + 1 < totalSections;

	return {
		mdast: {
			...(root as MdastNode),
			type: "root",
			children: root.children.slice(start, end),
		} satisfies MdastRoot,
		totalSections,
		hasMore,
	};
}

export function sliceMdastSectionBySegmentCount(
	mdastJson: JsonValue,
	sectionIndex: number,
	segmentCountPerSection: number,
): { mdast: JsonValue; totalSections: number; hasMore: boolean } {
	const root = getRoot(mdastJson);
	if (!root) {
		return {
			mdast: { type: "root", children: [] as JsonValue[] },
			totalSections: 1,
			hasMore: false,
		};
	}

	const boundaries = getSectionStartIndexesBySegmentCount(
		root.children,
		segmentCountPerSection,
	);
	const totalSections = boundaries.length;
	const safeSection = Number.isFinite(sectionIndex)
		? Math.max(0, sectionIndex)
		: 0;

	if (safeSection >= totalSections) {
		return {
			mdast: { type: "root", children: [] as JsonValue[] },
			totalSections,
			hasMore: false,
		};
	}

	const start = boundaries[safeSection] ?? 0;
	const end = boundaries[safeSection + 1] ?? root.children.length;
	const hasMore = safeSection + 1 < totalSections;

	return {
		mdast: {
			...(root as MdastNode),
			type: "root",
			children: root.children.slice(start, end),
		} satisfies MdastRoot,
		totalSections,
		hasMore,
	};
}

export function sliceMdastSectionGroup(
	mdastJson: JsonValue,
	groupIndex: number,
	groupCount: number,
): { mdast: JsonValue; totalSections: number; hasMore: boolean } {
	const root = getRoot(mdastJson);
	if (!root) {
		return {
			mdast: { type: "root", children: [] as JsonValue[] },
			totalSections: 1,
			hasMore: false,
		};
	}

	const boundaries = getSectionStartIndexes(root.children);
	const totalSections = boundaries.length;
	const safeGroupCount = Number.isFinite(groupCount)
		? Math.max(1, Math.floor(groupCount))
		: 1;
	const groupSize = Math.max(1, Math.ceil(totalSections / safeGroupCount));
	const totalGroups = Math.max(1, Math.ceil(totalSections / groupSize));
	const safeGroup = Number.isFinite(groupIndex) ? Math.max(0, groupIndex) : 0;

	if (safeGroup >= totalGroups) {
		return {
			mdast: { type: "root", children: [] as JsonValue[] },
			totalSections: totalGroups,
			hasMore: false,
		};
	}

	const startSection = safeGroup * groupSize;
	const endSection = Math.min((safeGroup + 1) * groupSize, totalSections);
	const start = boundaries[startSection] ?? 0;
	const end =
		endSection < totalSections
			? (boundaries[endSection] ?? root.children.length)
			: root.children.length;
	const hasMore = safeGroup + 1 < totalGroups;

	return {
		mdast: {
			...(root as MdastNode),
			type: "root",
			children: root.children.slice(start, end),
		} satisfies MdastRoot,
		totalSections: totalGroups,
		hasMore,
	};
}

export function collectSegmentNumbersFromMdast(mdastJson: JsonValue): number[] {
	// mdast（root）を DFS して `data.hProperties["data-number-id"]` を集める。
	// section=0/1... の mdast slice を渡すと、その section に必要な segments.number を取れる。
	const root = getRoot(mdastJson);
	if (!root) return [];

	const numbers = new Set<number>();
	for (const child of root.children)
		collectSegmentNumbersFromNode(child, numbers);
	return Array.from(numbers).sort((a, b) => a - b);
}
