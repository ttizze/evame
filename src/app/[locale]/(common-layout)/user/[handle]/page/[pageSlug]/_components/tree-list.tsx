import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type TreeNode = {
	id: string | number;
	label: ReactNode;
	children: TreeNode[];
};

interface TreeNodeItemProps {
	node: TreeNode;
	isOpen?: boolean;
	renderChildren: (children: TreeNode[]) => ReactNode;
}

export function TreeNodeItem({
	node,
	isOpen = false,
	renderChildren,
}: TreeNodeItemProps) {
	if (node.children.length === 0) {
		return <li>{node.label}</li>;
	}

	return (
		<li>
			<details
				className="open:[&>summary>svg]:rotate-90 [&>summary>svg]:transition-transform [&>summary>svg]:duration-200 [&>summary>svg]:ease-in-out"
				open={isOpen}
			>
				<summary className="cursor-pointer list-none flex items-center gap-1">
					<ChevronRight aria-hidden="true" className="size-4" />
					<div className="flex-1">{node.label}</div>
				</summary>
				<ul className="mt-2 ml-2 space-y-2 border-l border-dashed border-border/70 pl-3 list-none">
					{renderChildren(node.children)}
				</ul>
			</details>
		</li>
	);
}

export function TreeList({ children }: { children: ReactNode }) {
	return <ul className="min-w-56 space-y-2 list-none">{children}</ul>;
}
