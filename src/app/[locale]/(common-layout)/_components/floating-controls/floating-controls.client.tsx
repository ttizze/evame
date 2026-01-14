"use client";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScrollVisibility } from "../hooks/use-scroll-visibility";
import { DisplayModeCycle } from "./display-mode-cycle.client";
import { ShareDialog } from "./share-dialog";

interface AnnotationType {
	key: string;
	label: string;
}

interface FloatingControlsProps {
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
	annotationTypes?: AnnotationType[]; // List of annotation types
	userLocale: string;
	sourceLocale: string;
}
export function FloatingControls({
	likeButton,
	position = `fixed bottom-4 left-1/2 -translate-x-1/2 duration-300 `,
	alwaysVisible = false,
	annotationTypes = [],
	userLocale,
	sourceLocale,
}: FloatingControlsProps) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);
	const [visibleAnnotations, setVisibleAnnotations] = useQueryState(
		"annotations",
		parseAsArrayOf(parseAsString, "~")
			.withDefault([])
			.withOptions({ shallow: true }),
	);
	useEffect(() => {
		const tokens = visibleAnnotations.filter(Boolean);
		if (tokens.length === 0) {
			delete document.documentElement.dataset.annotations;
			return;
		}
		document.documentElement.dataset.annotations = tokens.join(" ");
	}, [visibleAnnotations]);

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
		<div className="flex gap-6 justify-center">
			<div className="flex flex-col items-center gap-1 group">
				<DisplayModeCycle
					afterClick={ignoreNextScroll}
					sourceLocale={sourceLocale}
					userLocale={userLocale}
				/>
				<span className="text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-foreground">
					View
				</span>
			</div>

			{annotationTypes.map((annotationType) => {
				const uniqueKey = annotationType.label;
				const isActive = visibleAnnotations.includes(uniqueKey);
				return (
					<Button
						className="h-10 px-3 rounded-full text-sm cursor-pointer"
						key={uniqueKey}
						onClick={() => toggleAnnotationType(annotationType)}
						title={`${isActive ? "Hide" : "Show"} ${annotationType.label}`}
						variant={isActive ? "default" : "outline"}
					>
						{annotationType.label}
					</Button>
				);
			})}

			{likeButton && (
				<div className="flex flex-col items-center gap-1 group">
					<div className="h-10 w-10">{likeButton}</div>
					<span className="text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-foreground">
						Like
					</span>
				</div>
			)}

			<div className="flex flex-col items-center gap-1 group">
				<ShareDialog />
				<span className="text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-foreground">
					Share
				</span>
			</div>
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
