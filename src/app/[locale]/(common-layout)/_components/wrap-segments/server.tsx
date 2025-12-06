import { createElement, type JSX } from "react";
import { WrapSegmentClient } from "@/app/[locale]/(common-layout)/_components/wrap-segments/client";
import type { SegmentForDetail, SegmentForList } from "@/app/[locale]/types";

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

		/* セグメント対象でなければそのまま DOM 要素を返す */
		if (!segment) return createElement(Tag, p, p.children);

		/* --- ここで Client Component に "シリアライズ可能な形" で渡す --- */
		const { children, ...rest } = p;
		return (
			<WrapSegmentClient
				interactive={interactive}
				segment={segment}
				tagName={Tag} // ★そのまま突っ込む
				tagProps={rest as JSX.IntrinsicElements[Tag]}
			>
				{children} {/* ← children は React が面倒見てくれる */}
			</WrapSegmentClient>
		);
	};
}
