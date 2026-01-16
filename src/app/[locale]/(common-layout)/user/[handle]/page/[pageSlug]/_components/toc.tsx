"use client";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocItem } from "../_domain/extract-toc-items";

type TocNode = {
	item: TocItem;
	children: TocItem[];
};

function buildTocNodes(items: TocItem[]): TocNode[] {
	const nodes: TocNode[] = [];
	let lastDepth3: TocNode | null = null;

	for (const item of items) {
		if (item.depth === 4 && lastDepth3) {
			lastDepth3.children.push(item);
			continue;
		}

		const node: TocNode = { item, children: [] };
		nodes.push(node);

		if (item.depth === 3) {
			lastDepth3 = node;
		} else if (item.depth < 3) {
			lastDepth3 = null;
		}
	}

	return nodes;
}

export default function TableOfContents({ items }: { items: TocItem[] }) {
	const nodes = buildTocNodes(items);

	return (
		<nav aria-label="Table of contents" data-testid="toc">
			<ol className="min-w-56 space-y-2 text-sm">
				{nodes.map(({ item, children }) => (
					<TocItemRow item={item} key={item.id} nestedItems={children} />
				))}
			</ol>
		</nav>
	);
}

const MAX_LABEL_LENGTH = 40;

function TocItemRow({
	item,
	nestedItems,
}: {
	item: TocItem;
	nestedItems: TocItem[];
}) {
	if (nestedItems.length === 0) {
		const padding = getPaddingClass(item.depth);
		return (
			<li className={padding}>
				<TocLinks item={item} />
			</li>
		);
	}

	return (
		<li className={getPaddingClass(item.depth)}>
			<details className="open:[&>summary>svg]:rotate-90 [&>summary>svg]:transition-transform [&>summary>svg]:duration-200 [&>summary>svg]:ease-in-out">
				<summary className="cursor-pointer list-none flex items-center gap-1">
					<ChevronRight aria-hidden="true" className="size-4" />
					<div className="flex-1">
						<TocLinks item={item} />
					</div>
				</summary>
				<ul className="mt-2 ml-2 space-y-2 border-l border-dashed border-border/70 pl-3">
					{nestedItems.map((child) => (
						<li key={child.id}>
							<TocLinks item={child} />
						</li>
					))}
				</ul>
			</details>
		</li>
	);
}

function TocLinks({ item }: { item: TocItem }) {
	const hasTranslation = Boolean(item.translatedText);
	const sourceLabel = truncateLabel(item.sourceText);
	const translatedLabel = item.translatedText
		? truncateLabel(item.translatedText)
		: null;

	return (
		<div className="space-y-1">
			<a
				className={cn(
					"seg-src block w-full px-2 py-1 text-left text-sm leading-snug text-pretty transition-colors  hover:underline",
					hasTranslation && "seg-has-tr",
				)}
				href={`#${item.id}`}
			>
				{sourceLabel}
			</a>
			{translatedLabel ? (
				<a
					className="seg-tr block w-full px-2 py-1 text-left text-xs leading-snug  text-pretty transition-colors hover:underline"
					href={`#${item.id}-tr`}
				>
					{translatedLabel}
				</a>
			) : null}
		</div>
	);
}

function getPaddingClass(depth: number): string {
	if (depth <= 1) return "pl-0";
	if (depth === 2) return "pl-3";
	if (depth === 3) return "pl-6";
	return "pl-9";
}

function truncateLabel(text: string): string {
	return text.length > MAX_LABEL_LENGTH
		? `${text.substring(0, MAX_LABEL_LENGTH)}...`
		: text;
}
