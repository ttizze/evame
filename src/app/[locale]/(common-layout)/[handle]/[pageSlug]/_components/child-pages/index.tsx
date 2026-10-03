import type { PageTitleTree } from "../../_db/queries";
import { CollapsibleTreeList } from "../page-navigation/collapsible-tree-list";
import { toCollapsibleTreeNodes } from "../page-navigation/page-tree";

interface ChildPagesProps {
	locale: string;
	pages: PageTitleTree[];
}

export function ChildPages({ locale, pages }: ChildPagesProps) {
	if (pages.length === 0) {
		return null;
	}

	const nodes = toCollapsibleTreeNodes(pages, locale);
	return (
		<div>
			<CollapsibleTreeList nodes={nodes} />
		</div>
	);
}
