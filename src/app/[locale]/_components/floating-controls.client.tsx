"use client";
import { MessageSquare } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShareDialog } from "../(common-layout)/user/[handle]/page/[pageSlug]/_components/share-dialog";
import { DisplayModeCycle } from "./display-mode-cycle.client";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";

interface FloatingControlsProps {
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
	annotationLabel?: string; // 注釈タイプのラベル（例: "Commentary"）
	hasAnnotations?: boolean; // 注釈があるかどうか
}
export function FloatingControls({
	likeButton,
	position = `fixed bottom-4 left-1/2 -translate-x-1/2
              max-w-prose w-full px-4 md:px-0 
              duration-300 `,
	alwaysVisible = false,
	annotationLabel,
	hasAnnotations = false,
}: FloatingControlsProps) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);
	const [showAnnotations, setShowAnnotations] = useQueryState(
		"showAnnotations",
		parseAsBoolean.withDefault(false),
	);

	/* --- ボタン列 --- */
	const Buttons = (
		<div className="flex gap-3 justify-center">
			<DisplayModeCycle afterClick={ignoreNextScroll} />

			{likeButton && <div className="h-10 w-10">{likeButton}</div>}

			{hasAnnotations && annotationLabel && (
				<Button
					className="h-10 w-10 rounded-full"
					onClick={() => {
						setShowAnnotations(!showAnnotations);
						ignoreNextScroll();
					}}
					size="icon"
					title={`${annotationLabel}を${showAnnotations ? "非表示" : "表示"}`}
					variant="outline"
				>
					<MessageSquare className="h-4 w-4" />
				</Button>
			)}

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
