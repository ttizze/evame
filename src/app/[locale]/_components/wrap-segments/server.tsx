import { createElement, type JSX } from "react";
import { WrapSegmentClient } from "@/app/[locale]/_components/wrap-segments/client";
import type { SegmentBundle } from "@/app/[locale]/types";

export function WrapSegment<Tag extends keyof JSX.IntrinsicElements>(
	Tag: Tag,
	bundles: SegmentBundle[],
	interactive: boolean = true,
) {
	return (p: JSX.IntrinsicElements[Tag] & { "data-number-id"?: number }) => {
		const id = p["data-number-id"];
		const bundle =
			id !== undefined ? bundles.find((b) => b.number === +id) : undefined;

		/* セグメント対象でなければそのまま DOM 要素を返す */
		if (!bundle) return createElement(Tag, p, p.children);

		/* --- ここで Client Component に "シリアライズ可能な形" で渡す --- */
		const { children, ...rest } = p;
		return (
			<WrapSegmentClient
				bundle={bundle}
				interactive={interactive}
				tagName={Tag} // ★そのまま突っ込む
				tagProps={rest as JSX.IntrinsicElements[Tag]}
			>
				{children} {/* ← children は React が面倒見てくれる */}
			</WrapSegmentClient>
		);
	};
}
