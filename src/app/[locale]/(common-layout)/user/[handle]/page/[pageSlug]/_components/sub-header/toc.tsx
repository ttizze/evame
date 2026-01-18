"use client";
import type { ReactNode } from "react";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { TocItem } from "../../_domain/extract-toc-items";
import { TreeList, type TreeNode, TreeNodeItem } from "../tree-list";

type TocTreeItem = {
	item: TocItem;
	children: TocItem[];
};

export default function Toc({ items }: { items: TocItem[] }) {
	const nodes = buildTocTree(items);

	const toTreeNode = (item: TocItem): TreeNode => ({
		id: item.anchorId,
		label: <TocLink item={item} />,
		children: [],
	});

	const renderNode = (node: TocTreeItem): ReactNode => {
		const treeNode: TreeNode = {
			id: node.item.anchorId,
			label: <TocLink item={node.item} />,
			children: node.children.map(toTreeNode),
		};
		return (
			<TreeNodeItem
				key={node.item.anchorId}
				node={treeNode}
				renderChildren={(children) =>
					children.map((child) => <li key={child.id}>{child.label}</li>)
				}
			/>
		);
	};

	return (
		<nav aria-label="Table of contents" data-testid="toc">
			<TreeList>{nodes.map(renderNode)}</TreeList>
		</nav>
	);
}

function TocLink({ item }: { item: TocItem }) {
	return (
		<a href={`#${item.anchorId}`}>
			<SegmentElement
				className="line-clamp-2 break-all overflow-wrap-anywhere text-sm hover:underline"
				interactive={false}
				segment={item.segment}
				tagName="span"
			/>
		</a>
	);
}

function buildTocTree(items: TocItem[]): TocTreeItem[] {
	const nodes: TocTreeItem[] = [];
	let lastDepth3: TocTreeItem | null = null;

	for (const item of items) {
		if (item.level === 4 && lastDepth3) {
			lastDepth3.children.push(item);
			continue;
		}

		const node: TocTreeItem = { item, children: [] };
		nodes.push(node);

		if (item.level === 3) {
			lastDepth3 = node;
			continue;
		}

		if (item.level < 3) {
			lastDepth3 = null;
		}
	}

	return nodes;
}
