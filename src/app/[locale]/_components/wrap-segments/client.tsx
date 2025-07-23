"use client";

import type { JSX } from "react";
import {
	Children,
	createElement,
	Fragment,
	isValidElement,
	type ReactNode,
} from "react";
import { useDisplay } from "@/app/_context/display-provider";
import type { SegmentBundle } from "@/app/[locale]/types";
import { TranslationSection } from "../mdast-to-react/translation-section/translation-section";

interface BaseProps {
	bundle: SegmentBundle;
	currentHandle?: string;
	children: ReactNode;
	/**
	 * If false, disable interactive UI (votes, popovers, etc.) inside TranslationSection.
	 * Defaults to true.
	 */
	interactive?: boolean;
}

export function WrapSegmentClient<Tag extends keyof JSX.IntrinsicElements>({
	bundle,
	tagName,
	tagProps,
	currentHandle,
	children,
	interactive = true,
}: BaseProps & {
	tagName: Tag;
	tagProps: JSX.IntrinsicElements[Tag];
}) {
	const { mode } = useDisplay();
	const hasTr = bundle.translations.length > 0;
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
						"data-number-id": bundle.segment.number,
					},
					children,
				)
			: null;

	/* 訳文 */
	const translation =
		eff !== "source" && hasTr
			? createElement(
					tagName,
					{
						...tagProps,
						key: `tr-${bundle.segment.id}`,
						"data-number-id": bundle.segment.number,
					},
					<TranslationSection
						currentHandle={currentHandle}
						interactive={interactive}
						segmentBundle={bundle}
					/>,
				)
			: null;

	return (
		<Fragment>
			{source}
			{translation}
		</Fragment>
	);
}
