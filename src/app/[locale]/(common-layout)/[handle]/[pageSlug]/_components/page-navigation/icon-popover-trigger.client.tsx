"use client";

import { ChevronDown } from "lucide-react";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { useState } from "react";
import { viewQueryState } from "@/app/[locale]/(common-layout)/_components/view-query";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

type Align = "start" | "center" | "end";

interface IconPopoverTriggerProps {
	icon: ReactNode;
	title: string;
	children: ReactNode;
	align: Align;
}

export function IconPopoverTrigger({
	icon,
	title,
	children,
	align,
}: IconPopoverTriggerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [view] = useQueryState("view", viewQueryState);

	return (
		<Popover onOpenChange={setIsOpen} open={isOpen}>
			<PopoverAnchor asChild>
				<span className="inline-flex">
					<PopoverTrigger asChild>
						<Button
							aria-label={title}
							className="flex items-center gap-2 rounded-full text-sm"
							title={title}
							variant="ghost"
						>
							{icon}
							<ChevronDown
								className={`size-4 transition-transform duration-200 ${
									isOpen ? "rotate-180" : ""
								}`}
							/>
						</Button>
					</PopoverTrigger>
				</span>
			</PopoverAnchor>
			<PopoverContent
				align={align}
				className="w-80 rounded-xl border border-border/70 bg-background p-4 shadow-lg dark:shadow-[0_9px_7px_rgba(255,255,255,0.1)]"
				data-view={view}
				onFocusOutside={(event) => event.preventDefault()}
			>
				{children}
			</PopoverContent>
		</Popover>
	);
}
