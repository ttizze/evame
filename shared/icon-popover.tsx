import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

export const popoverContentClass =
	"z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

export const iconPopoverContentClass =
	"w-80 rounded-xl border border-border/70 bg-background p-4 shadow-lg dark:shadow-[0_9px_7px_rgba(255,255,255,0.1)]";

export function IconPopoverButton({
	icon,
	title,
	...props
}: ComponentProps<typeof Button> & { icon: ReactNode; title: string }) {
	return (
		<Button
			aria-label={title}
			className="group flex items-center gap-2 rounded-full text-sm"
			title={title}
			variant="ghost"
			{...props}
		>
			{icon}
			<ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
		</Button>
	);
}
