"use client";

import type { JSX, ReactNode } from "react";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text.client";
import { createSegmentElement } from "./segment.shared";
import type { SegmentForRender } from "./segment-for-render";

const SegmentElementShared = createSegmentElement({ sanitizeAndParseText });

/**
 * クライアントで追加ロードした section を描画する用。
 *
 * - `.seg-src/.seg-tr/.seg-has-tr` を付けるので DisplayMode の CSS が効く
 * - `interactive=true` のときだけ訳文を `data-segment-id` 付きにする
 *   （`TranslationFormOnClick` がイベント委譲で拾う）
 */
export function SegmentElementClient({
	tagName,
	segment,
	interactive = true,
	className,
	tagProps,
	children,
}: {
	tagName?: keyof JSX.IntrinsicElements;
	segment: SegmentForRender;
	interactive?: boolean;
	className?: string;
	tagProps?: Record<string, unknown>;
	children?: ReactNode;
}) {
	return SegmentElementShared({
		tagName,
		segment,
		interactive,
		className,
		tagProps,
		children,
	});
}
