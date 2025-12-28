import type { JSX, ReactNode } from "react";
import { createElement } from "react";

type SegmentNumbered = { number: number };

type SegmentElementProps<S> = {
	tagName?: keyof JSX.IntrinsicElements;
	segment: S;
	interactive?: boolean;
	tagProps?: Record<string, unknown>;
	children?: ReactNode;
};

type SegmentElementComponent<S> = (
	props: SegmentElementProps<S>,
) => JSX.Element;

export function createWrapSegment<
	Tag extends keyof JSX.IntrinsicElements,
	S extends SegmentNumbered,
>(params: {
	Tag: Tag;
	segments: S[];
	interactive: boolean;
	SegmentElement: SegmentElementComponent<S>;
}) {
	const segmentsMap = new Map<number, S>(
		params.segments.map((s) => [s.number, s]),
	);

	return (p: JSX.IntrinsicElements[Tag] & { "data-number-id"?: number }) => {
		const id = p["data-number-id"];
		const segment = id !== undefined ? segmentsMap.get(+id) : undefined;

		if (!segment) return createElement(params.Tag, p, p.children);

		const { children, ...rest } = p;
		return (
			<params.SegmentElement
				interactive={params.interactive}
				segment={segment}
				tagName={params.Tag}
				tagProps={rest}
			>
				{children}
			</params.SegmentElement>
		);
	};
}
