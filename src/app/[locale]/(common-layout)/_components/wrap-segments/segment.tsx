import type { JSX, ReactNode } from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text";
import type { Segment } from "@/app/[locale]/types";

type SegmentElementProps = {
	tagName?: keyof JSX.IntrinsicElements;
	segment: Segment;
	interactive?: boolean;
	className?: string;
	tagProps?: Record<string, unknown>;
	/** mdast経由の場合はネストされたReact要素を保持するために使用。なければsegment.textをパース */
	children?: ReactNode;
};

/** src/tr ペアを描画する共通コンポーネント */
export function SegmentElement({
	tagName: Tag = "span",
	segment,
	interactive = true,
	className,
	tagProps,
	children,
}: SegmentElementProps) {
	const baseClassName = [tagProps?.className, className, "block seg-cv"]
		.filter(Boolean)
		.join(" ");
	const hasTr = segment.translationText != null;

	return (
		<>
			<Tag
				{...tagProps}
				className={`${baseClassName} seg-src ${hasTr ? "seg-has-tr" : ""}`}
				data-number-id={segment.number}
			>
				{children ?? sanitizeAndParseText(segment.text ?? "")}
			</Tag>
			{hasTr && (
				<Tag
					{...tagProps}
					className={`${baseClassName} seg-tr ${interactive ? "cursor-pointer select-text" : ""}`}
					data-number-id={segment.number}
					id={tagProps?.id ? `${tagProps.id}-tr` : undefined}
					{...(interactive && {
						role: "button",
						tabIndex: 0,
						"data-segment-id": segment.id,
					})}
				>
					{sanitizeAndParseText(segment.translationText ?? "")}
				</Tag>
			)}
		</>
	);
}
