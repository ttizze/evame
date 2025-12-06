"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { ShareDialog } from "../(common-layout)/user/[handle]/page/[pageSlug]/_components/share-dialog";
import { DisplayModeCycle } from "./display-mode-cycle.client";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";

interface AnnotationType {
	key: string;
	label: string;
}

interface FloatingControlsProps {
	likeButton?: React.ReactNode;
	position?: string;
	alwaysVisible?: boolean;
	annotationTypes?: AnnotationType[]; // 注釈タイプのリスト
}
export function FloatingControls({
	likeButton,
	position = `fixed bottom-4 left-1/2 -translate-x-1/2
              max-w-prose w-full px-4 md:px-0 
              duration-300 `,
	alwaysVisible = false,
	annotationTypes = [],
}: FloatingControlsProps) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);
	const [visibleAnnotations, setVisibleAnnotations] = useQueryState(
		"annotations",
		parseAsArrayOf(parseAsString, "~").withDefault([]),
	);

	// key_label の組み合わせで一意に識別（URLセーフな区切り文字）
	const getUniqueKey = (annotationType: AnnotationType) =>
		`${annotationType.key}_${annotationType.label}`;

	const toggleAnnotationType = (annotationType: AnnotationType) => {
		const uniqueKey = getUniqueKey(annotationType);
		const isVisible = visibleAnnotations.includes(uniqueKey);
		if (isVisible) {
			setVisibleAnnotations(visibleAnnotations.filter((k) => k !== uniqueKey));
		} else {
			setVisibleAnnotations([...visibleAnnotations, uniqueKey]);
		}
		ignoreNextScroll();
	};

	/* --- ボタン列 --- */
	const Buttons = (
		<div className="flex gap-3 justify-center flex-wrap">
			<DisplayModeCycle afterClick={ignoreNextScroll} />

			{likeButton && <div className="h-10 w-10">{likeButton}</div>}

			{annotationTypes.map((annotationType) => {
				const uniqueKey = getUniqueKey(annotationType);
				const isActive = visibleAnnotations.includes(uniqueKey);
				return (
					<Button
						key={uniqueKey}
						className="h-10 px-3 rounded-full text-sm"
						onClick={() => toggleAnnotationType(annotationType)}
						title={`${annotationType.label}を${isActive ? "非表示" : "表示"}`}
						variant={isActive ? "default" : "outline"}
					>
						{annotationType.label}
					</Button>
				);
			})}

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
