import { fetchChildPagesTree } from "@/app/[locale]/_db/page-tree.server";
import { CollapsibleTreeList } from "../page-navigation/collapsible-tree-list";
import { toCollapsibleTreeNodes } from "../page-navigation/page-tree";

interface ChildPagesProps {
	parentId: number;
	locale: string;
}

export async function ChildPages({ parentId, locale }: ChildPagesProps) {
	const children = await fetchChildPagesTree(parentId, locale);

	if (!children || children.length === 0) {
		return null;
	}

	const nodes = toCollapsibleTreeNodes(children);

	return (
		<div>
			<CollapsibleTreeList nodes={nodes} />
		</div>
	);
}
