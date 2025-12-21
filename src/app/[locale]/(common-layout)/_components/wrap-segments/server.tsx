import type { JSX } from "react";
import { createElement } from "react";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { SegmentForDetail, SegmentForList } from "@/app/[locale]/types";

/**
 * rehype-react 用アダプタ。
 *
 * `mdastToReact` では `components: { p: Component, h2: Component, ... }` の形で
 * 「タグごとのコンポーネント関数」を渡す必要があるため、ここでは高階関数の形を取る。
 *
 * 実際の描画ロジックは `SegmentElement` に集約し、ここは
 * - data-number-id → segment を引く
 * - SegmentElement に props/children を渡す
 * だけを担当する。
 */
export function WrapSegment<Tag extends keyof JSX.IntrinsicElements>(
	Tag: Tag,
	segments: (SegmentForDetail | SegmentForList)[],
	interactive: boolean = true,
) {
	const segmentsMap = new Map<number, SegmentForDetail | SegmentForList>(
		segments.map((s) => [s.number, s]),
	);

	return (p: JSX.IntrinsicElements[Tag] & { "data-number-id"?: number }) => {
		const id = p["data-number-id"];
		const segment = id !== undefined ? segmentsMap.get(+id) : undefined;

		// セグメント対象でなければそのまま DOM 要素を返す
		if (!segment) return createElement(Tag, p, p.children);

		const { children, ...rest } = p;
		return (
			<SegmentElement
				interactive={interactive}
				segment={segment}
				tagName={Tag}
				tagProps={rest}
			>
				{children}
			</SegmentElement>
		);
	};
}
