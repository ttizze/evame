"use client";
import { ChevronDown, List } from "lucide-react";
import { useState } from "react";
import { useDisplay } from "@/app/_context/display-provider";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TocItem } from "../../_domain/extract-toc-items";
import Toc from "./toc";

export function TocTrigger({ items }: { items: TocItem[] }) {
	const [isOpen, setIsOpen] = useState(false);
	const { mode } = useDisplay();

	if (items.length === 0) return null;

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<PopoverAnchor asChild>
				<span className="inline-flex">
					<PopoverTrigger asChild>
						<Button
							aria-label="Table of Contents"
							className="flex items-center gap-2 rounded-full text-sm"
							title="Table of Contents"
							variant="ghost"
						>
							<List className="size-5" />
							<ChevronDown
								className={cn(
									"size-4 transition-transform duration-200",
									isOpen && "rotate-180",
								)}
							/>
						</Button>
					</PopoverTrigger>
				</span>
			</PopoverAnchor>
			<PopoverContent
				align="end"
				className="w-80 rounded-xl border border-border/70 bg-background p-4 shadow-lg dark:shadow-[0_9px_7px_rgba(255,255,255,0.1)]"
				data-display-mode={mode}
				onFocusOutside={(event) => event.preventDefault()}
			>
				<Toc items={items} />
			</PopoverContent>
		</Popover>
	);
}
