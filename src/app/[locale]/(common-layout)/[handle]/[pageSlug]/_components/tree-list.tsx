import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type TreeNode = {
	id: string | number;
	label: ReactNode;
	children: TreeNode[];
};

export function TreeNodeItem({
	node,
	isOpen = false,
	isActive = false,
	renderChildren,
}: {
	node: TreeNode;
	isOpen?: boolean;
	isActive?: boolean;
	renderChildren: (children: TreeNode[]) => ReactNode;
}) {
	if (node.children.length === 0) {
		return (
			<li
				aria-current={isActive ? "page" : undefined}
				className={isActive ? "underline underline-offset-2" : undefined}
			>
				{node.label}
			</li>
		);
	}

	return (
		<li>
			<details
				className="open:[&>summary>svg]:rotate-90 [&>summary>svg]:transition-transform [&>summary>svg]:duration-200"
				open={isOpen}
			>
				<summary
					aria-current={isActive ? "page" : undefined}
					className={`flex cursor-pointer list-none items-center gap-1 ${isActive ? "underline underline-offset-2" : ""}`}
				>
					<ChevronRight aria-hidden="true" className="size-4" />
					<div className="flex-1">{node.label}</div>
				</summary>
				<ul className="mt-2 ml-2 list-none space-y-2 border-l border-dashed border-border/70 pl-3">
					{renderChildren(node.children)}
				</ul>
			</details>
		</li>
	);
}

export function TreeList({ children }: { children: ReactNode }) {
	return <ul className="min-w-56 list-none space-y-2">{children}</ul>;
}
