"use client";
import { useContentDisplayState } from "@/app/[locale]/_hooks/use-content-display-state";
import type { SegmentBundle } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { Lock } from "lucide-react";
import { SquarePen } from "lucide-react";
import { TranslationSection } from "./translation-section";
interface SegmentAndTranslationSectionProps {
	segmentBundle: SegmentBundle;
	showLockIcon?: boolean;
	segmentTextClassName?: string;
	currentHandle?: string;
	editablePageSlug?: string;
}

export function SegmentAndTranslationSection({
	segmentBundle,
	showLockIcon = false,
	segmentTextClassName,
	currentHandle,
	editablePageSlug,
}: SegmentAndTranslationSectionProps) {
	const { showOriginal, showTranslation } = useContentDisplayState();
	return (
		<span className="flex flex-col">
			{showOriginal && (
				<span
					className={`inline-block ${
						segmentBundle.translations.length === 0 || !showTranslation
							? "text-gray-700 dark:text-gray-200 [&>a]:text-gray-700 dark:[&>a]:text-gray-200 [&>strong]:text-gray-700 dark:[&>strong]:text-gray-200"
							: "text-gray-300 dark:text-gray-600 [&>a]:text-gray-300 dark:[&>a]:text-gray-600 [&>strong]:text-gray-300 dark:[&>strong]:text-gray-600"
					} ${segmentTextClassName}`}
				>
					{showLockIcon && <Lock className="h-6 w-6 mr-1 inline" />}
					{currentHandle && editablePageSlug && (
						<div className="ml-2">
							<Link
								href={`/user/${currentHandle}/page/${editablePageSlug}/edit`}
							>
								<SquarePen className="w-5 h-5" />
							</Link>
						</div>
					)}
					{segmentBundle.segment.text}
				</span>
			)}
			{showTranslation && segmentBundle.translations.length > 0 && (
				<TranslationSection
					key={`translation-${segmentBundle.segment.id}`}
					segmentBundle={segmentBundle}
					currentHandle={currentHandle}
				/>
			)}
		</span>
	);
}
