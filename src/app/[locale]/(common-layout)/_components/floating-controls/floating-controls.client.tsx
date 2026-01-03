"use client";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShareDialog } from "../../user/[handle]/page/[pageSlug]/_components/share-dialog";
import { useScrollVisibility } from "../hooks/use-scroll-visibility";
import { DisplayModeCycle } from "./display-mode-cycle.client";

interface AnnotationType {
	key: string;
	label: string;
}

interface FloatingControlsProps {
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
	annotationTypes?: AnnotationType[]; // List of annotation types
}
export function FloatingControls({
	likeButton,
	position = `fixed bottom-4 left-1/2 -translate-x-1/2 duration-300 `,
	alwaysVisible = false,
	annotationTypes = [],
}: FloatingControlsProps) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);
	const [visibleAnnotations, setVisibleAnnotations] = useQueryState(
		"annotations",
		parseAsArrayOf(parseAsString, "~").withDefault([]),
	);

	const toggleAnnotationType = (annotationType: AnnotationType) => {
		const uniqueKey = annotationType.label;
		const isVisible = visibleAnnotations.includes(uniqueKey);
		if (isVisible) {
			setVisibleAnnotations(visibleAnnotations.filter((k) => k !== uniqueKey));
		} else {
			setVisibleAnnotations([...visibleAnnotations, uniqueKey]);
		}
		ignoreNextScroll();
	};

	/* --- Buttons --- */
	const Buttons = (
		<div className="flex gap-4 justify-center">
			<DisplayModeCycle afterClick={ignoreNextScroll} />

			{annotationTypes.map((annotationType) => {
				const uniqueKey = annotationType.label;
				const isActive = visibleAnnotations.includes(uniqueKey);
				return (
					<Button
						className="h-10 px-3 rounded-full text-sm"
						key={uniqueKey}
						onClick={() => toggleAnnotationType(annotationType)}
						title={`${isActive ? "Hide" : "Show"} ${annotationType.label}`}
						variant={isActive ? "default" : "outline"}
					>
						{annotationType.label}
					</Button>
				);
			})}

			{likeButton && <div className="h-10 w-10">{likeButton}</div>}

			<ShareDialog />
		</div>
	);

	return (
		<div
			className={cn(
				`${position} z-50 w-auto border rounded-full py-3 px-5 backdrop-blur-sm `,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			{Buttons}
		</div>
	);
}
