import type { CategoryNode } from "../../../types";

export function collectPathMap(root: CategoryNode): Map<string, CategoryNode> {
	const dirPathToNodeMap = new Map<string, CategoryNode>();

	const traverse = (node: CategoryNode, dirSegments: string[]) => {
		if (dirSegments.length > 0) {
			dirPathToNodeMap.set(dirSegments.join("/"), node);
		}
		for (const [dirSegment, child] of node.children.entries()) {
			traverse(child, [...dirSegments, dirSegment]);
		}
	};

	traverse(root, []);
	return dirPathToNodeMap;
}
