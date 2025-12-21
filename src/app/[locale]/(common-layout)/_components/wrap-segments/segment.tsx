import { createElement, Fragment, type JSX, type ReactNode } from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text.server";
import type { SegmentForDetail, SegmentForList } from "@/app/[locale]/types";

const CONTENT_VISIBILITY =
	"supports-[content-visibility:auto]:content-visibility-auto supports-[content-visibility:auto]:[contain-intrinsic-size:1px_800px] supports-[content-visibility:auto]:[contain:layout_paint_style]";

/**
 * セグメント1つを「普通の props コンポーネント」として描画する（高階関数にしない）。
 *
 * - `.seg-src/.seg-tr/.seg-has-tr` を付けるので DisplayMode の CSS が効く
 * - `interactive=true` のときだけ訳文を `data-segment-id` 付きボタンにする
 *   （`TranslationFormOnClick` がクリックでフォームを出す）
 */
export function SegmentElement({
	tagName,
	segment,
	interactive = true,
	className,
	tagProps,
	children,
}: {
	tagName?: keyof JSX.IntrinsicElements;
	segment: SegmentForDetail | SegmentForList;
	interactive?: boolean;
	className?: string;
	tagProps?: Record<string, unknown>;
	children?: ReactNode;
}) {
	const TagName = tagName ?? "span";
	const hasTr = segment.segmentTranslation !== null;
	const baseClassName =
		`${(tagProps?.className as string | undefined) ?? ""} ${className ?? ""} block ${CONTENT_VISIBILITY}`.trim();

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
				const trText = segment.segmentTranslation?.text ?? "";
				return createElement(
					TagName,
					{
						...(tagProps as Record<string, unknown> | undefined),
						// Avoid duplicate IDs (headings etc.)
						id: undefined,
						className: `${baseClassName} seg-tr`.trim(),
						"data-number-id": segment.number,
					},
					interactive ? (
						<button
							className="text-inherit text-left cursor-pointer select-text"
							data-best-translation-id={segment.segmentTranslation?.id}
							data-segment-id={segment.id}
							type="button"
						>
							{sanitizeAndParseText(trText)}
						</button>
					) : (
						sanitizeAndParseText(trText)
					),
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
							className: `${annotationBase} seg-tr`.trim(),
							"data-annotation-type": typeKey,
							"data-number-id": a.number,
						},
						interactive ? (
							<button
								className="text-inherit text-left cursor-pointer select-text"
								data-best-translation-id={a.segmentTranslation?.id}
								data-segment-id={a.id}
								type="button"
							>
								{sanitizeAndParseText(a.segmentTranslation?.text ?? "")}
							</button>
						) : (
							sanitizeAndParseText(a.segmentTranslation?.text ?? "")
						),
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
