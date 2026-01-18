import { ListTree } from "lucide-react";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTree } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import type { PageTreeNode } from "./_db/queries.server";
import {
	CollapsibleTreeList,
	type CollapsibleTreeNode,
} from "./collapsible-tree-list";
import { IconPopoverTrigger } from "./icon-popover-trigger.client";

export function PageLink({ node }: { node: PageForTree }) {
	return (
		<Link
			className="hover:underline"
			href={`/user/${node.userHandle}/page/${node.slug}`}
		>
			<SegmentElement
				className="line-clamp-1 break-all overflow-wrap-anywhere"
				interactive={false}
				segment={{
					id: node.titleSegmentId,
					contentId: node.id,
					number: 0,
					text: node.titleText,
					translationText: node.titleTranslationText,
				}}
				tagName="span"
			/>
		</Link>
	);
}

export function toCollapsibleTreeNodes(
	nodes: PageTreeNode[],
): CollapsibleTreeNode[] {
	return nodes.map((node) => ({
		id: node.id,
		label: <PageLink node={node} />,
		children: toCollapsibleTreeNodes(node.children),
	}));
}

export function PageTree({
	rootNode,
	treeNodes,
	currentPageId,
}: {
	rootNode: PageForTree;
	treeNodes: PageTreeNode[];
	currentPageId: number;
}) {
	const collapsibleNodes = toCollapsibleTreeNodes(treeNodes);

	return (
		<IconPopoverTrigger
			align="start"
			icon={<ListTree className="size-5" />}
			title="page tree"
		>
			<nav aria-label="Page tree">
				<div className="mb-2 text-sm font-medium">
					<PageLink node={rootNode} />
				</div>
				<CollapsibleTreeList
					activeId={currentPageId}
					nodes={collapsibleNodes}
				/>
			</nav>
		</IconPopoverTrigger>
	);
}
