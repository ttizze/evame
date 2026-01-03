"use client";

import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

type HelpPopoverProps = {
	title: string;
	description: ReactNode;
};

export function HelpPopover({ title, description }: HelpPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<CircleHelp className="h-6 w-6 cursor-pointer" />
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 rounded-xl p-3 text-sm">
				<p className="font-semibold text-foreground">{title}</p>
				<div className="mt-1 text-muted-foreground">{description}</div>
			</PopoverContent>
		</Popover>
	);
}
