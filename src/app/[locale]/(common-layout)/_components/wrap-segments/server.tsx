import type { JSX } from "react";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { SegmentForDetail, SegmentForList } from "@/app/[locale]/types";
import { createWrapSegment } from "./wrap-segment.shared";

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
	return createWrapSegment({
		Tag,
		segments,
		interactive,
		SegmentElement,
	});
}
