import { SegmentWrapper } from "@/app/[locale]/_components/segment-wrapper.client";
import type { SegmentBundle } from "@/app/[locale]/types";
import { type JSX, createElement } from "react";
import React from "react";
import { Tweet as XPost } from "react-tweet";
const TWEET_ID_RE =
	/https?:\/\/(?:mobile\.)?(?:twitter\.com|x\.com)\/(?:[^/]+\/status|i\/web\/status)\/(\d+)(?:\?.*)?$/i;

export function wrapSegment<Tag extends keyof JSX.IntrinsicElements>(
	Tag: Tag,
	bundles: SegmentBundle[],
	current?: string,
) {
	return (p: JSX.IntrinsicElements[Tag] & { "data-number-id"?: number }) => {
		/* ───────── ここから追加ロジック ───────── */
		// <p> の唯一の子が tweet リンクなら <TweetContainer> で置換
		const kids = React.Children.toArray(p.children);
		if (
			Tag === "p" &&
			kids.length === 1 &&
			React.isValidElement<{ href?: string }>(kids[0])
		) {
			const href = kids[0].props.href ?? "";
			const match = TWEET_ID_RE.exec(href);
			if (match) {
				return <XPost id={match[1]} />;
			}
		}
		const id = p["data-number-id"];
		const bundle =
			id !== undefined
				? bundles.find((b) => b.segment.number === +id)
				: undefined;

		/* ───────── 追加ここまで ───────── */
		/* セグメント対象でなければそのまま DOM 要素を返す */
		if (!bundle) return createElement(Tag, p, p.children);

		/* --- ここで Client Component に “シリアライズ可能な形” で渡す --- */
		const { children, ...rest } = p;
		return (
			<SegmentWrapper
				bundle={bundle}
				tagName={Tag}
				tagProps={rest as JSX.IntrinsicElements[Tag]} // ★そのまま突っ込む
				currentHandle={current}
			>
				{children} {/* ← children は React が面倒見てくれる */}
			</SegmentWrapper>
		);
	};
}
