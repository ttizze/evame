import type { JSX } from "react";
import { WrapSegment } from "@/app/[locale]/_components/mdast-to-react/wrap-segments/server";
import type { SegmentBundle } from "@/app/[locale]/types";

interface SegmentWrapProps<Tag extends keyof JSX.IntrinsicElements = "span"> {
	/** HTML tag to render. Defaults to 'span'. */
	tagName?: Tag;
	/** Segment bundle to display */
	bundle: SegmentBundle;
	/** Logged-in user handle (for voting UI) */
	currentHandle?: string;
	/** Disable interactive UI (votes, popovers). Defaults to true */
	interactive?: boolean;
	/** Extra class names for the outer tag */
	className?: string;
}

export function SegmentWrap<Tag extends keyof JSX.IntrinsicElements = "span">({
	tagName = "span" as Tag,
	bundle,
	currentHandle,
	interactive = true,
	className,
}: SegmentWrapProps<Tag>) {
	const WrapSegmentComponent = WrapSegment(
		tagName,
		[bundle],
		currentHandle,
		interactive,
	);
	return (
		<WrapSegmentComponent
			className={className}
			data-number-id={bundle.segment.number}
		>
			{bundle.segment.text}
		</WrapSegmentComponent>
	);
}
