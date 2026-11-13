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
		<div className="flex items-center justify-center gap-2 [&_button]:h-10 [&_button]:min-w-10 [&_button]:rounded-full [&_button]:bg-transparent [&_button:hover]:bg-accent/60">
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
				`${position} z-50 w-auto rounded-full border border-border/60 bg-background/90 px-3 py-2 shadow-sm backdrop-blur-sm `,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			{Buttons}
		</div>
	);
}
