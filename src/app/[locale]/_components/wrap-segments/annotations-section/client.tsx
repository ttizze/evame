"use client";

import { parseAsBoolean, useQueryState } from "nuqs";
import type { JSX } from "react";
import type { SegmentForDetail } from "@/app/[locale]/types";
import { WrapSegmentClient } from "../client";

interface AnnotationsSectionProps<Tag extends keyof JSX.IntrinsicElements> {
	segment: SegmentForDetail;
	tagName: Tag;
	tagProps: JSX.IntrinsicElements[Tag];
	interactive?: boolean;
}

export function AnnotationsSection<Tag extends keyof JSX.IntrinsicElements>({
	segment,
	tagName,
	tagProps,
	interactive = true,
}: AnnotationsSectionProps<Tag>) {
	const [showAnnotations] = useQueryState(
		"showAnnotations",
		parseAsBoolean.withDefault(false),
	);

	if (!showAnnotations || !segment.annotations) {
		return null;
	}

	return (
		<>
			{segment.annotations.map((link, index) => {
				const annotationSegment = link.annotationSegment as SegmentForDetail;
				return (
					<WrapSegmentClient
						interactive={interactive}
						key={`annotation-${annotationSegment.id}-${index}`}
						segment={annotationSegment}
						tagName={tagName}
						tagProps={{
							...tagProps,
							className: `${tagProps.className ?? ""} ml-4`,
						}}
					>
						{annotationSegment.text}
					</WrapSegmentClient>
				);
			})}
		</>
	);
}
