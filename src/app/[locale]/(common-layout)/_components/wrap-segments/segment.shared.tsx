import { createElement, Fragment, type JSX, type ReactNode } from "react";

type TranslationLike = { id: number; text: string | null } | null;

type SegmentLike = {
	id: number;
	number: number;
	text: string | null;
	segmentTranslation: TranslationLike;
};

type AnnotationSegmentLike = SegmentLike & {
	segmentType?: { label?: string | null } | null;
};

type AnnotationLinkLike = { annotationSegment: AnnotationSegmentLike };

type SegmentMaybeAnnotated = SegmentLike & {
	annotations?: AnnotationLinkLike[];
};

export function createSegmentElement(params: {
	sanitizeAndParseText: (text: string) => ReactNode;
}) {
	return function SegmentElementShared({
		tagName,
		segment,
		interactive = true,
		className,
		tagProps,
		children,
	}: {
		tagName?: keyof JSX.IntrinsicElements;
		segment: SegmentMaybeAnnotated;
		interactive?: boolean;
		className?: string;
		tagProps?: Record<string, unknown>;
		children?: ReactNode;
	}) {
		const TagName = tagName ?? "span";
		const hasTr = segment.segmentTranslation !== null;
		const baseClassName =
			`${(tagProps?.className as string | undefined) ?? ""} ${className ?? ""} block seg-cv`.trim();

		const sourceEl = createElement(
			TagName,
			{
				...(tagProps as Record<string, unknown> | undefined),
				className:
					`${baseClassName} seg-src ${hasTr ? "seg-has-tr" : ""}`.trim(),
				"data-number-id": segment.number,
			},
			children ?? params.sanitizeAndParseText(segment.text ?? ""),
		);

		const translationEl = hasTr
			? (() => {
					const trText = segment.segmentTranslation?.text ?? "";
					return createElement(
						TagName,
						{
							...(tagProps as Record<string, unknown> | undefined),
							// Avoid duplicate IDs (headings etc.)
							id: undefined,
							className:
								`${baseClassName} seg-tr ${interactive ? "cursor-pointer select-text" : ""}`.trim(),
							role: interactive ? "button" : undefined,
							tabIndex: interactive ? 0 : undefined,
							"data-number-id": segment.number,
							...(interactive
								? {
										"data-best-translation-id": segment.segmentTranslation?.id,
										"data-segment-id": segment.id,
									}
								: null),
						},
						params.sanitizeAndParseText(trText),
					);
				})()
			: null;

		const annotations = Array.isArray(segment.annotations)
			? segment.annotations
			: [];
		const annotationsEls =
			annotations.length > 0
				? annotations.flatMap((link, index) => {
						const a = link.annotationSegment;
						const typeKey = a?.segmentType?.label ?? "";
						if (!typeKey) return [];

						const aHasTr = a.segmentTranslation !== null;
						const annotationBase =
							`${baseClassName} seg-ann hidden ml-4 text-sm leading-relaxed`.trim();

						const src = createElement(
							TagName,
							{
								...(tagProps as Record<string, unknown> | undefined),
								id: undefined,
								className:
									`${annotationBase} seg-src ${aHasTr ? "seg-has-tr" : ""}`.trim(),
								"data-annotation-type": typeKey,
								"data-number-id": a.number,
							},
							params.sanitizeAndParseText(a.text ?? ""),
						);

						if (!aHasTr)
							return [<Fragment key={`ann-${a.id}-${index}`}>{src}</Fragment>];

						const tr = createElement(
							TagName,
							{
								...(tagProps as Record<string, unknown> | undefined),
								id: undefined,
								className:
									`${annotationBase} seg-tr ${interactive ? "cursor-pointer select-text" : ""}`.trim(),
								role: interactive ? "button" : undefined,
								tabIndex: interactive ? 0 : undefined,
								"data-annotation-type": typeKey,
								"data-number-id": a.number,
								...(interactive
									? {
											"data-best-translation-id": a.segmentTranslation?.id,
											"data-segment-id": a.id,
										}
									: null),
							},
							params.sanitizeAndParseText(a.segmentTranslation?.text ?? ""),
						);

						return [
							<Fragment key={`ann-${a.id}-${index}`}>
								{src}
								{tr}
							</Fragment>,
						];
					})
				: null;

		return (
			<Fragment>
				{sourceEl}
				{translationEl}
				{annotationsEls}
			</Fragment>
		);
	};
}
