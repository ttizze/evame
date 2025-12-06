"use client";

/**
 * ## アーキテクチャ決定: 本文 vs 翻訳・注釈のレンダリング方式
 *
 * - 本文: mdast → mdastToReact（リッチコンテンツ対応: 画像、コードハイライト、埋め込み等）
 * - 翻訳・注釈: segment.text → sanitizeAndParseText（プレーンテキスト）
 *
 * 理由: 本文はMarkdownで書かれリッチコンテンツを含む可能性があるが、
 * 翻訳・注釈は基本的にプレーンテキストなので軽量な処理で十分。
 * 統一も検討したが、翻訳をmdast化すると処理コストとDB増加の懸念がある。
 */

import type { JSX } from "react";
import {
	Children,
	createElement,
	Fragment,
	isValidElement,
	type ReactNode,
} from "react";
import { useDisplay } from "@/app/_context/display-provider";
import type { Segment } from "@/app/[locale]/types";
import { AnnotationsSection } from "./annotations-section/client";
import { TranslationSection } from "./translation-section/client";

interface BaseProps {
	segment: Segment;
	children: ReactNode;
	/**
	 * If false, disable interactive UI (votes, popovers, etc.) inside TranslationSection.
	 * Defaults to true.
	 */
	interactive?: boolean;
}

export function WrapSegmentClient<Tag extends keyof JSX.IntrinsicElements>({
	segment,
	tagName,
	tagProps,
	children,
	interactive = true,
}: BaseProps & {
	tagName: Tag;
	tagProps: JSX.IntrinsicElements[Tag];
}) {
	const { mode } = useDisplay();
	const hasTr = segment.segmentTranslation !== null;
	const eff = mode === "user" && !hasTr ? "source" : mode;

	/* --------------------------------------------------
		Markdown から変換された画像は Next.js の <Image> を
		ラップした関数コンポーネントのみが来る想定。
		→ `node.props.src` の有無で画像と判定すれば十分。
	--------------------------------------------------- */
	const hasImage = Children.toArray(children).some(
		(node) =>
			isValidElement<{ src?: unknown }>(node) && node.props.src !== undefined,
	);

	/* 色クラス差し替え */
	const base = `${tagProps.className ?? ""} block`;
	const gray = "text-gray-300 dark:text-gray-600";
	const normal = "text-gray-700 dark:text-gray-200";
	const srcCls =
		eff !== "source" && hasTr ? `${base} ${gray}` : `${base} ${normal}`;

	/* 原文：user モードでも画像なら必ず表示 */
	const source =
		eff !== "user" || hasImage
			? createElement(
					tagName,
					{
						...tagProps,
						className: srcCls,
						"data-number-id": segment.number,
					},
					children,
				)
			: null;

	const translation: ReactNode =
		eff !== "source" && hasTr ? (
			<TranslationSection
				interactive={interactive}
				segment={segment}
				tagName={tagName}
				tagProps={tagProps}
			/>
		) : null;

	const annotations: ReactNode =
		"annotations" in segment ? (
			<AnnotationsSection
				interactive={interactive}
				segment={segment}
				tagName={tagName}
				tagProps={tagProps}
			/>
		) : null;

	return (
		<Fragment>
			{source}
			{translation}
			{annotations}
		</Fragment>
	);
}
