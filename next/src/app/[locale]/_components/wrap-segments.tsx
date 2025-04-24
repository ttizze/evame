"use client";
import type { SegmentBundle } from "@/app/[locale]/types";
import { useDisplay } from "@/app/_context/display-provider";
import { Fragment, createElement } from "react";
import type { JSX } from "react/jsx-runtime";
import { TranslationSection } from "./segment-and-translation-section/translation-section";

export function wrapSegment<Tag extends keyof JSX.IntrinsicElements>(
	Tag: Tag,
	bundles: SegmentBundle[],
	current?: string,
) {
	return (
		allProps: JSX.IntrinsicElements[Tag] & { "data-number-id"?: number },
	) => {
		const { children, ...rest } = allProps;
		const id = allProps["data-number-id"];
		const bundle =
			id !== undefined
				? bundles.find((b) => b.segment.number === +id)
				: undefined;

		/* ── セグメント対象でなければそのまま ── */
		if (!bundle) return createElement(Tag, allProps, children);

		/* ── 表示モード＆色 ───────────────────── */
		const { mode } = useDisplay();
		const hasTr = bundle.translations.length > 0;
		const effMode = mode === "user" && !hasTr ? "source" : mode;

		const gray = "text-gray-300 dark:text-gray-600";
		const normal = "text-gray-700 dark:text-gray-200";
		const srcColor = effMode !== "source" && hasTr ? gray : normal;

		/* ── オリジナル (=source) ── */
		const src =
			effMode !== "user"
				? createElement(
						Tag,
						{
							...rest,
							className: [rest.className, srcColor].filter(Boolean).join(" "),
						},
						children,
					)
				: null;

		/* ── 翻訳 (=TranslationSection) ── */
		const tr =
			effMode !== "source" && hasTr
				? createElement(
						Tag,
						{ ...rest, key: `tr-${id}` },
						<TranslationSection
							segmentBundle={bundle}
							currentHandle={current}
							interactive
						/>,
					)
				: null;

		/* ── 同じタグで上下に並べる ── */
		return createElement(Fragment, null, src, tr);
	};
}
