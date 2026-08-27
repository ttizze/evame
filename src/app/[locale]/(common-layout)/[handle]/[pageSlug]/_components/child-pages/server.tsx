import type { ScriptureTreeNode } from "@/server/scripture-tree";
import {
	CollapsibleTreeList,
	type CollapsibleTreeNode,
} from "../page-navigation/collapsible-tree-list";

function toTreeNodes(
	nodes: readonly ScriptureTreeNode[],
): CollapsibleTreeNode[] {
	return nodes.map((node) => ({
		id: node.id,
		label: (
			<a className="hover:underline" href={node.href}>
				{node.title}
			</a>
		),
		children: toTreeNodes(node.children),
	}));
}

/** 詳細中の公開子孫scriptureだけを旧URLの階層リンクとして表示する。 */
export function ChildPages({
	pages,
}: {
	pages?: readonly ScriptureTreeNode[];
}) {
	if (!pages || pages.length === 0) return null;

	return (
		<nav aria-label="Child pages" className="not-prose mt-8">
			<CollapsibleTreeList nodes={toTreeNodes(pages)} />
		</nav>
	);
}
