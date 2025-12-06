"use client";

import { sanitizeAndParseText } from "@/app/[locale]/_lib/sanitize-and-parse-text.client";
import type { SegmentForDetail } from "@/app/[locale]/types";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import type { JSX } from "react";
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
	const [visibleAnnotations] = useQueryState(
		"annotations",
		parseAsArrayOf(parseAsString, "~").withDefault([]),
	);

	if (!segment.annotations || visibleAnnotations.length === 0) {
		return null;
	}

	// visibleAnnotationsに含まれる注釈タイプのみをフィルタリング
	// key_label の組み合わせで一意に識別（URLセーフな区切り文字）
	const filteredAnnotations = segment.annotations.filter((link) => {
		const annotationSegment = link.annotationSegment as SegmentForDetail;
		const segType = annotationSegment?.segmentType;
		if (!segType?.key || !segType?.label) return false;
		const uniqueKey = `${segType.key}_${segType.label}`;
		return visibleAnnotations.includes(uniqueKey);
	});

	if (filteredAnnotations.length === 0) {
		return null;
	}

	return (
		<>
			{filteredAnnotations.map((link, index) => {
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
						{sanitizeAndParseText(annotationSegment.text)}
					</WrapSegmentClient>
				);
			})}
		</>
	);
}
