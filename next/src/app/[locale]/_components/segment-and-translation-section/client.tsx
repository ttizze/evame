"use client";
import type { SegmentBundle } from "@/app/[locale]/types";
import { useDisplay } from "@/app/_context/display-provider";
import { TranslationSection } from "./translation-section";

interface SegmentAndTranslationSectionProps {
	segmentBundle: SegmentBundle;
	segmentTextClassName?: string;
	currentHandle?: string;
}

export function SegmentAndTranslationSection({
	segmentBundle,
	segmentTextClassName,
	currentHandle,
}: SegmentAndTranslationSectionProps) {
	const { mode } = useDisplay();
	return (
		<span className="flex flex-col">
			{mode !== "translation-only" && (
				<span
					className={`inline-block ${
						/* 原文が「目立つ色」か「淡色」かをモードで判定 */
						segmentBundle.translations.length === 0 || mode === "source-only"
							? "text-gray-700 dark:text-gray-200 [&>a]:text-gray-700 dark:[&>a]:text-gray-200 [&>strong]:text-gray-700 dark:[&>strong]:text-gray-200"
							: "text-gray-300 dark:text-gray-600 [&>a]:text-gray-300 dark:[&>a]:text-gray-600 [&>strong]:text-gray-300 dark:[&>strong]:text-gray-600"
					} ${segmentTextClassName}`}
				>
					{segmentBundle.segment.text}
				</span>
			)}
			{mode !== "source-only" && segmentBundle.translations.length > 0 && (
				<TranslationSection
					key={`translation-${segmentBundle.segment.id}`}
					segmentBundle={segmentBundle}
					currentHandle={currentHandle}
				/>
			)}
		</span>
	);
}
