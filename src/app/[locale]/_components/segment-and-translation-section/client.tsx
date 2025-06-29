"use client";
import type { ReactNode } from "react";
import { useDisplay } from "@/app/_context/display-provider";
import type { SegmentBundle } from "@/app/[locale]/types";
import { TranslationSection } from "./translation-section";

interface SegmentAndTranslationSectionProps {
	segmentBundle: SegmentBundle;
	//textを表示するだけだとtextの間にあるstrong等のtagが落ちてしまうため､それを防ぐために
	//ReactNodeを受け取り直接表示している
	//title部分等の､そういった心配がない箇所についてはsegmentbundleのtextをそのまま表示する
	elements?: string | ReactNode | ReactNode[];
	segmentTextClassName?: string;
	currentHandle?: string;
	interactive?: boolean;
}

export function SegmentAndTranslationSection({
	segmentBundle,
	elements,
	segmentTextClassName,
	currentHandle,
	interactive = true,
}: SegmentAndTranslationSectionProps) {
	const { mode } = useDisplay();
	const hasTranslation = segmentBundle.translations.length > 0;

	/* ------------------------------------------------------------------
		「user」モードなのに訳が無い場合は、実質「source」扱いに変換する
	------------------------------------------------------------------ */
	const effectiveMode = mode === "user" && !hasTranslation ? "source" : mode;

	/* ------------------------------------------------------------------
		原文テキストの色を決める
		- 対訳表示(both) や user 表示(＝訳だけ) のときは淡色
		- それ以外(source 単独表示) は通常色
	------------------------------------------------------------------ */
	const sourceColor =
		effectiveMode !== "source" && hasTranslation
			? "text-gray-300 dark:text-gray-600 [&>a]:text-gray-300 dark:[&>a]:text-gray-600 [&>strong]:text-gray-300 dark:[&>strong]:text-gray-600"
			: "text-gray-700 dark:text-gray-200 [&>a]:text-gray-700 dark:[&>a]:text-gray-200 [&>strong]:text-gray-700 dark:[&>strong]:text-gray-200";

	/* --------------------- JSX --------------------- */
	return (
		<span className="flex flex-col">
			{/* 原文を表示するのは user 以外（source / both）のとき */}
			{effectiveMode !== "user" && (
				<span className={`inline-block ${segmentTextClassName} ${sourceColor}`}>
					{elements ?? segmentBundle.segment.text}
				</span>
			)}
			{/* 訳を表示するのは source 以外（user / both）のとき */}
			{effectiveMode !== "source" && hasTranslation && (
				<TranslationSection
					currentHandle={currentHandle}
					interactive={interactive}
					key={`translation-${segmentBundle.segment.id}`}
					segmentBundle={segmentBundle}
				/>
			)}
		</span>
	);
}
