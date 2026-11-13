import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";
import { ShareDialog } from "./share-dialog";
import { ViewCycle } from "./view-cycle.client";

interface FloatingControlsProps {
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
	userLocale: string;
	sourceLocale: string;
}
export function FloatingControls({
	likeButton,
	position = `fixed bottom-4 left-1/2 -translate-x-1/2 duration-300 `,
	alwaysVisible = false,
	userLocale,
	sourceLocale,
}: FloatingControlsProps) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);

	/* --- Buttons --- */
	const Buttons = (
		<div className="flex gap-6 justify-center">
			<Suspense fallback={null}>
				<ViewCycle
					afterClick={ignoreNextScroll}
					sourceLocale={sourceLocale}
					userLocale={userLocale}
				/>
			</Suspense>
			{likeButton && <div className="h-10 w-10">{likeButton}</div>}
			<ShareDialog />
		</div>
	);

	return (
		<div
			className={cn(
				`${position} z-50 w-auto border rounded-full py-3 px-9 backdrop-blur-sm `,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			{Buttons}
		</div>
	);
}
