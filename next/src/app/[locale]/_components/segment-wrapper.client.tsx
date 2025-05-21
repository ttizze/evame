"use client";

import type { SegmentBundle } from "@/app/[locale]/types";
import { useDisplay } from "@/app/_context/display-provider";
import { Fragment, type ReactNode, createElement } from "react";
import type { JSX } from "react";
import { TranslationSection } from "./segment-and-translation-section/translation-section";

interface BaseProps {
	bundle: SegmentBundle;
	currentHandle?: string;
	children: ReactNode;
}

export function SegmentWrapper<Tag extends keyof JSX.IntrinsicElements>({
	bundle,
	tagName,
	tagProps,
	currentHandle,
	children,
}: BaseProps & {
	tagName: Tag;
	tagProps: JSX.IntrinsicElements[Tag];
}) {
	const { mode } = useDisplay();
	const hasTr = bundle.translations.length > 0;
	const eff = mode === "user" && !hasTr ? "source" : mode;

	/* 色クラス差し替え */
	const base = tagProps.className ?? "";
	const gray = "text-gray-300 dark:text-gray-600";
	const normal = "text-gray-700 dark:text-gray-200";
	const srcCls =
		eff !== "source" && hasTr ? `${base} ${gray}` : `${base} ${normal}`;

	/* 原文 */
	const source =
		eff !== "user"
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
						segmentBundle={bundle}
						currentHandle={currentHandle}
						interactive
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
