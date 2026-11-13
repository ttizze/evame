import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { viewQueryState } from "@/app/[locale]/(common-layout)/_components/view-query";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	IconPopoverButton,
	iconPopoverContentClass,
} from "../../../../../../../../shared/icon-popover";

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
	const [view] = useQueryState("view", viewQueryState);

	return (
		<Popover>
			<PopoverAnchor asChild>
				<span className="inline-flex">
					<PopoverTrigger asChild>
						<IconPopoverButton icon={icon} title={title} />
					</PopoverTrigger>
				</span>
			</PopoverAnchor>
			<PopoverContent
				align={align}
				className={iconPopoverContentClass}
				data-view={view}
				onFocusOutside={(event) => event.preventDefault()}
			>
				{children}
			</PopoverContent>
		</Popover>
	);
}
