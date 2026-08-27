import type { ReactNode } from "react";
import { TreeList, type TreeNode, TreeNodeItem } from "../tree-list";

export type CollapsibleTreeNode = TreeNode;

function findPathToId(
	nodes: readonly CollapsibleTreeNode[],
	targetId: string | number,
): Set<string | number> {
	const path = new Set<string | number>();
	const search = (node: CollapsibleTreeNode): boolean => {
		if (node.id === targetId) {
			path.add(node.id);
			return true;
		}
		for (const child of node.children) {
			if (search(child)) {
				path.add(node.id);
				return true;
			}
		}
		return false;
	};
	for (const node of nodes) search(node);
	return path;
}

export function CollapsibleTreeList({
	nodes,
	activeId,
}: {
	nodes: CollapsibleTreeNode[];
	activeId?: string | number;
}) {
	const openIds =
		activeId === undefined ? new Set() : findPathToId(nodes, activeId);
	const renderNode = (node: CollapsibleTreeNode): ReactNode => (
		<TreeNodeItem
			isActive={node.id === activeId}
			isOpen={openIds.has(node.id)}
			key={node.id}
			node={node}
			renderChildren={(children) => children.map(renderNode)}
		/>
	);
	return <TreeList>{nodes.map(renderNode)}</TreeList>;
}
