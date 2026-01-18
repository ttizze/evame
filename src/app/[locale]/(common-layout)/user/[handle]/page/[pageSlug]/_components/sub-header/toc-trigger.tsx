"use client";
import { List } from "lucide-react";
import type { TocItem } from "../../_domain/extract-toc-items";
import { IconPopoverTrigger } from "../page-navigation/icon-popover-trigger.client";
import Toc from "./toc";

export function TocTrigger({ items }: { items: TocItem[] }) {
	if (items.length === 0) return null;

	return (
		<IconPopoverTrigger
			align="end"
			icon={<List className="size-5" />}
			title="Table of Contents"
		>
			<Toc items={items} />
		</IconPopoverTrigger>
	);
}
