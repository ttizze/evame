import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function HelpPopover({
	title,
	description,
	trigger,
}: {
	title: string;
	description: ReactNode;
	trigger: ReactNode;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				{trigger ?? (
					<button aria-label={title} className="cursor-pointer" type="button">
						<CircleHelp className="h-6 w-6" />
					</button>
				)}
			</PopoverTrigger>
			<PopoverContent
				align="center"
				aria-label={title}
				className="w-64 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl p-3 text-sm"
			>
				<p className="font-semibold text-foreground">{title}</p>
				<div className="mt-1 text-muted-foreground">{description}</div>
			</PopoverContent>
		</Popover>
	);
}
