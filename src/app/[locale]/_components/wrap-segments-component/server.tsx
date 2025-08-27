import type { JSX } from "react";
import { WrapSegment } from "@/app/[locale]/_components/wrap-segments/server";
import type { SegmentForUI } from "@/app/[locale]/types";

interface WrapSegmentsComponentProps<
	Tag extends keyof JSX.IntrinsicElements = "span",
> {
	/** HTML tag to render. Defaults to 'span'. */
	tagName?: Tag;
	/** Segment to display */
	segment: SegmentForUI;
	/** Disable interactive UI (votes, popovers). Defaults to true */
	interactive?: boolean;
	/** Extra class names for the outer tag */
	className?: string;
}

export function WrapSegmentsComponent<
	Tag extends keyof JSX.IntrinsicElements = "span",
>({
	tagName = "span" as Tag,
	segment,
	interactive = true,
	className,
}: WrapSegmentsComponentProps<Tag>) {
	const WrapSegmentComponent = WrapSegment(tagName, [segment], interactive);
	return (
		<WrapSegmentComponent className={className} data-number-id={segment.number}>
			{segment.text}
		</WrapSegmentComponent>
	);
}
