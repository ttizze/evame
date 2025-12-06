import type { JSX } from "react";
import { WrapSegment } from "@/app/[locale]/(common-layout)/_components/wrap-segments/server";
import type { SegmentForDetail, SegmentForList } from "@/app/[locale]/types";

interface WrapSegmentsComponentProps<
	Tag extends keyof JSX.IntrinsicElements = "span",
> {
	/** HTML tag to render. Defaults to 'span'. */
	tagName?: Tag;
	/** Segment to display */
	segment: SegmentForDetail | SegmentForList;
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
