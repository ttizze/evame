import type { ReactNode } from "react";
import { TreeList, type TreeNode, TreeNodeItem } from "../tree-list";

export type CollapsibleTreeNode = TreeNode;

interface CollapsibleTreeListProps {
	nodes: CollapsibleTreeNode[];
	activeId?: string | number;
}

function findPathToId(
	nodes: CollapsibleTreeNode[],
	targetId: string | number,
): Set<string | number> {
	const path = new Set<string | number>();

	function search(node: CollapsibleTreeNode): boolean {
		if (node.id === targetId) {
			return true;
		}
		for (const child of node.children) {
			if (search(child)) {
				path.add(node.id);
				return true;
			}
		}
		return false;
	}

	for (const node of nodes) {
		search(node);
	}
	return path;
}

export function CollapsibleTreeList({
	nodes,
	activeId,
}: CollapsibleTreeListProps) {
	const openIds = activeId ? findPathToId(nodes, activeId) : new Set();

	const renderNode = (node: CollapsibleTreeNode): ReactNode => (
		<TreeNodeItem
			isOpen={openIds.has(node.id)}
			key={node.id}
			node={node}
			renderChildren={(children) => children.map(renderNode)}
		/>
	);

	return <TreeList>{nodes.map(renderNode)}</TreeList>;
}
