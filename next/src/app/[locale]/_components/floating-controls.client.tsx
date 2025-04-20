"use client";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { ShareDialog } from "../(common-layout)/user/[handle]/page/[slug]/_components/share-dialog";
import { DisplayModeCycle } from "./display-mode-cycle";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";
interface FloatingControlsProps {
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
}
export function FloatingControls({
	likeButton,
	position = `fixed bottom-4 right-4 md:right-auto md:left-1/2 
              md:-translate-x-1/2 max-w-prose w-full px-4 md:px-0 
              duration-300 `,
	alwaysVisible = false,
}: FloatingControlsProps) {
	const { isVisible, onScroll, ignoreNextScroll } =
		useScrollVisibility(alwaysVisible);

	/* --- スクロール監視 --- */
	useEffect(() => {
		if (alwaysVisible) return;
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [onScroll, alwaysVisible]);

	/* --- ボタン列 --- */
	const Buttons = (
		<div className="flex gap-3 justify-center">
			<DisplayModeCycle afterClick={ignoreNextScroll} />

			{likeButton && <div className="h-12 w-12">{likeButton}</div>}

			<div className="h-12 w-12">
				<ShareDialog />
			</div>
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
