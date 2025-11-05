import { beautifySlug, parseSegmentLabel } from "./helpers";
import type { DirectoryNode, ImportEntry } from "./types";

export function createDirectoryRoot(title: string): DirectoryNode {
	return {
		segment: "",
		title: beautifySlug(title),
		order: 0,
		children: new Map(),
	};
}

export function ensurePath(
	root: DirectoryNode,
	segments: string[],
): DirectoryNode {
	let current = root;
	for (const segment of segments) {
		if (!current.children.has(segment)) {
			const { order, title } = parseSegmentLabel(segment);
			current.children.set(segment, {
				segment,
				title,
				order,
				children: new Map<string, DirectoryNode>(),
			});
		}
		const child = current.children.get(segment);
		if (!child) {
			throw new Error(`Failed to resolve directory segment: ${segment}`);
		}
		current = child;
	}
	return current;
}

export function buildDirectoryTree(
	entries: ImportEntry[],
	rootTitle: string,
): DirectoryNode {
	const root = createDirectoryRoot(rootTitle);
	for (const entry of entries) {
		ensurePath(root, entry.resolvedDirSegments);
	}
	return root;
}

export function collectPathMap(
	root: DirectoryNode,
): Map<string, DirectoryNode> {
	const map = new Map<string, DirectoryNode>();

	const traverse = (node: DirectoryNode, path: string[]) => {
		if (path.length > 0) {
			map.set(path.join("/"), node);
		}
		for (const [segment, child] of node.children.entries()) {
			traverse(child, [...path, segment]);
		}
	};

	traverse(root, []);
	return map;
}
