import { ListTree } from "lucide-react";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTree } from "@/app/[locale]/types";
import type { PageTreeNode } from "../../_db/queries";
import {
	CollapsibleTreeList,
	type CollapsibleTreeNode,
} from "./collapsible-tree-list";
import { IconPopoverTrigger } from "./icon-popover-trigger";

export function PageLink({
	node,
	locale,
}: {
	node: PageForTree;
	locale: string;
}) {
	return (
		<a
			className="hover:underline"
			href={`/${locale}/${node.userHandle}/${node.slug}`}
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
		</a>
	);
}

export function toCollapsibleTreeNodes(
	nodes: PageTreeNode[],
	locale: string,
): CollapsibleTreeNode[] {
	return nodes.map((node) => ({
		id: node.id,
		label: <PageLink locale={locale} node={node} />,
		children: toCollapsibleTreeNodes(node.children, locale),
	}));
}

export function PageTree({
	rootNode,
	treeNodes,
	currentPageId,
	locale,
}: {
	rootNode: PageForTree;
	treeNodes: PageTreeNode[];
	currentPageId: number;
	locale: string;
}) {
	const collapsibleNodes = toCollapsibleTreeNodes(treeNodes, locale);

	return (
		<IconPopoverTrigger
			align="start"
			icon={<ListTree className="size-5" />}
			title="page tree"
		>
			<nav aria-label="Page tree">
				<div className="mb-2 text-sm font-medium">
					<PageLink locale={locale} node={rootNode} />
				</div>
				<CollapsibleTreeList
					activeId={currentPageId}
					nodes={collapsibleNodes}
				/>
			</nav>
		</IconPopoverTrigger>
	);
}
