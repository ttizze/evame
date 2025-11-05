"use client";
import { useMemo } from "react";
import { useLinkedSegments } from "@/app/_context/linked-segment-provider.client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShareDialog } from "../(common-layout)/user/[handle]/page/[pageSlug]/_components/share-dialog";
import { DisplayModeCycle } from "./display-mode-cycle.client";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";

interface FloatingControlsProps {
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
}
export function FloatingControls({
	likeButton,
	position = `fixed bottom-4 left-1/2 -translate-x-1/2
              max-w-prose w-full px-4 md:px-0 
              duration-300 `,
	alwaysVisible = false,
}: FloatingControlsProps) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);
	const linkedSegments = useLinkedSegments(true);

	const annotationButtons = useMemo(() => {
		if (!linkedSegments || linkedSegments.types.length === 0) return null;
		return linkedSegments.types.map((type) => {
			const active = linkedSegments.isVisible(type.key);
			return (
				<Button
					aria-label={`Toggle ${type.label} annotations`}
					aria-pressed={active}
					className={cn(
						"h-10 rounded-full px-3 text-xs font-semibold",
						active ? "bg-primary text-primary-foreground" : "border",
					)}
					key={type.key}
					onClick={() => {
						linkedSegments.toggle(type.key);
						ignoreNextScroll();
					}}
					title={`${active ? "Hide" : "Show"} ${type.label}`}
					variant={active ? "default" : "ghost"}
				>
					<span className="flex flex-col leading-none">
						<span>{type.label}</span>
						<span className="text-[10px] font-normal text-muted-foreground">
							{type.count}
						</span>
					</span>
				</Button>
			);
		});
	}, [ignoreNextScroll, linkedSegments]);

	/* --- ボタン列 --- */
	const Buttons = (
		<div className="flex flex-wrap gap-3 justify-center">
			<DisplayModeCycle afterClick={ignoreNextScroll} />

			{annotationButtons}

			{likeButton && <div className="h-10 w-10">{likeButton}</div>}

			<ShareDialog />
		</div>
	);

	return (
		<div
			className={cn(
				`${position} z-50 max-w-prose w-full md:w-auto border rounded-full p-3 bg-gray-50 dark:bg-gray-900 shadow-lg dark:shadow-gray-900`,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			{Buttons}
		</div>
	);
}
