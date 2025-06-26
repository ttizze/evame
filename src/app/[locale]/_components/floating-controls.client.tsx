"use client";
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

	/* --- ボタン列 --- */
	const Buttons = (
		<div className="flex gap-3 justify-center">
			<DisplayModeCycle afterClick={ignoreNextScroll} />

			{likeButton && <div className="h-10 w-10">{likeButton}</div>}

			<ShareDialog />
		</div>
	);

	return (
		<div
			className={cn(
				`${position} z-50 w-64 border rounded-full p-2 bg-gray-50 dark:bg-gray-900 shadow-lg dark:shadow-gray-900`,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			{Buttons}
		</div>
	);
}
