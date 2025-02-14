"use client";
import type {
	AddTranslationFormTarget,
	VoteTarget,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { NavigationLink } from "@/components/navigation-link";
import { Lock } from "lucide-react";
import { SquarePen } from "lucide-react";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import type { SegmentWithTranslations } from "../../types";
import { TranslationSection } from "./translation-section";
interface SegmentAndTranslationSectionProps {
	segmentWithTranslations: SegmentWithTranslations;
	elements: string | ReactNode | ReactNode[];
	showLockIcon?: boolean;
	segmentTextClassName?: string;
	currentHandle: string | undefined;
	isOwner?: boolean;
	slug?: string;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export function SegmentAndTranslationSection({
	segmentWithTranslations,
	elements,
	showLockIcon = false,
	segmentTextClassName,
	currentHandle,
	isOwner,
	slug,
	voteTarget,
	addTranslationFormTarget,
}: SegmentAndTranslationSectionProps) {
	const [showOriginal, ] = useQueryState("showOriginal", {
		parse: (val) => val === "true",
		serialize: (val) => (val ? "true" : "false"),
	});
	const [showTranslation, ] = useQueryState(
		"showTranslation",
		{
			parse: (val) => val === "true",
			serialize: (val) => (val ? "true" : "false"),
		},
	);
	return (
		<>
			{showOriginal && (
				<span className="flex items-center">
					<span
						className={`inline-block ${
							segmentWithTranslations.segmentTranslationsWithVotes.length ===
								0 || !showTranslation
								? "text-gray-700 dark:text-gray-200 [&>a]:text-gray-700 dark:[&>a]:text-gray-200 [&>strong]:text-gray-700 dark:[&>strong]:text-gray-200"
								: "text-gray-300 dark:text-gray-600 [&>a]:text-gray-300 dark:[&>a]:text-gray-600 [&>strong]:text-gray-300 dark:[&>strong]:text-gray-600"
						} ${segmentTextClassName}`}
					>
						{showLockIcon && <Lock className="h-6 w-6 mr-1 inline" />}
						{elements}
					</span>
					{isOwner && slug && (
						<div className="ml-auto">
							<NavigationLink href={`/user/${currentHandle}/page/${slug}/edit`}>
								<SquarePen className="w-5 h-5" />
							</NavigationLink>
						</div>
					)}
				</span>
			)}
			{showTranslation &&
				segmentWithTranslations.segmentTranslationsWithVotes.length > 0 && (
					<TranslationSection
						key={`translation-${segmentWithTranslations.segment.id}`}
						segmentWithTranslations={segmentWithTranslations}
						currentHandle={currentHandle}
						voteTarget={voteTarget}
						addTranslationFormTarget={addTranslationFormTarget}
					/>
				)}
		</>
	);
}
