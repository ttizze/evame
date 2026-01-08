import { createElement, Fragment, type JSX, type ReactNode } from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text.server";
import type { Segment, SegmentForDetail } from "@/app/[locale]/types";

/**
 * セグメント1つを「普通の props コンポーネント」として描画する（高階関数にしない）。
 *
 * - `.seg-src/.seg-tr/.seg-has-tr` を付けるので DisplayMode の CSS が効く
 * - `interactive=true` のときだけ訳文を `data-segment-id` 付きボタンにする
 *   （`TranslationFormOnClick` がクリックでフォームを出す）
 */
type SegmentElementProps = {
	tagName?: keyof JSX.IntrinsicElements;
	segment: Segment;
	interactive?: boolean;
	className?: string;
	tagProps?: Record<string, unknown>;
	children?: ReactNode;
};

export function SegmentElement({
	tagName,
	segment,
	interactive = true,
	className,
	tagProps,
	children,
}: SegmentElementProps) {
	const TagName = tagName ?? "span";
	const translation =
		"segmentTranslation" in segment
			? segment.segmentTranslation
			: segment.translationId !== null
				? {
						id: segment.translationId,
						text: segment.translationText,
					}
				: null;
	const hasTr = translation !== null;
	const baseClassName =
		`${(tagProps?.className as string | undefined) ?? ""} ${className ?? ""} block seg-cv`.trim();

	const sourceEl = createElement(
		TagName,
		{
			...(tagProps as Record<string, unknown> | undefined),
			className: `${baseClassName} seg-src ${hasTr ? "seg-has-tr" : ""}`.trim(),
			"data-number-id": segment.number,
		},
		children ?? sanitizeAndParseText(segment.text ?? ""),
	);

	const translationEl = hasTr
		? (() => {
				const trText = translation?.text ?? "";
				return createElement(
					TagName,
					{
						...(tagProps as Record<string, unknown> | undefined),
						// Avoid duplicate IDs (headings etc.)
						id: tagProps?.id ? `${tagProps.id}-tr` : undefined,
						className:
							`${baseClassName} seg-tr ${interactive ? "cursor-pointer select-text" : ""}`.trim(),
						role: interactive ? "button" : undefined,
						tabIndex: interactive ? 0 : undefined,
						"data-number-id": segment.number,
						...(interactive
							? {
									"data-best-translation-id": translation?.id,
									"data-segment-id": segment.id,
								}
							: null),
					},
					sanitizeAndParseText(trText),
				);
			})()
		: null;

	const annotationsEls =
		"annotations" in segment && Array.isArray(segment.annotations)
			? segment.annotations.flatMap((link, index) => {
					const a = link.annotationSegment as SegmentForDetail;
					const segType = a?.segmentType;
					const typeKey = segType?.label ?? "";
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
						sanitizeAndParseText(a.text ?? ""),
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
						sanitizeAndParseText(a.segmentTranslation?.text ?? ""),
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
}
