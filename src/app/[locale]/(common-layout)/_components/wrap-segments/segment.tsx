import type { JSX, ReactNode } from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text.server";
import type { SegmentForDetail, SegmentForList } from "@/app/[locale]/types";
import { createSegmentElement } from "./segment.shared";

/**
 * セグメント1つを「普通の props コンポーネント」として描画する（高階関数にしない）。
 *
 * - `.seg-src/.seg-tr/.seg-has-tr` を付けるので DisplayMode の CSS が効く
 * - `interactive=true` のときだけ訳文を `data-segment-id` 付きボタンにする
 *   （`TranslationFormOnClick` がクリックでフォームを出す）
 */
const SegmentElementShared = createSegmentElement({ sanitizeAndParseText });

export function SegmentElement(props: {
	tagName?: keyof JSX.IntrinsicElements;
	segment: SegmentForDetail | SegmentForList;
	interactive?: boolean;
	className?: string;
	tagProps?: Record<string, unknown>;
	children?: ReactNode;
}) {
	return SegmentElementShared(props);
}
