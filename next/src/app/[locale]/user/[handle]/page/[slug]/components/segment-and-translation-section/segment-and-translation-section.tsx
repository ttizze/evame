import { Lock } from "lucide-react";
import { SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import type { AddTranslationFormIntent } from "~/routes/resources+/add-translation-form/route";
import type { VoteIntent } from "~/routes/resources+/vote-buttons";
import type { SegmentWithTranslations } from "../../types";
import { TranslationSection } from "./TranslationSection";

interface SegmentAndTranslationSectionProps {
	segmentWithTranslations: SegmentWithTranslations;
	elements: string | ReactNode | ReactNode[];
	showLockIcon?: boolean;
	sourceTextClassName?: string;
	showOriginal: boolean;
	showTranslation: boolean;
	currentHandle: string | undefined;
	isOwner?: boolean;
	slug?: string;
	voteIntent: VoteIntent;
	addTranslationFormIntent: AddTranslationFormIntent;
}

export function SegmentAndTranslationSection({
	segmentWithTranslations,
	elements,
	showLockIcon = false,
	sourceTextClassName,
	showOriginal = true,
	showTranslation = true,
	currentHandle,
	isOwner,
	slug,
	voteIntent,
	addTranslationFormIntent,
}: SegmentAndTranslationSectionProps) {
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
						} ${sourceTextClassName}`}
					>
						{showLockIcon && <Lock className="h-6 w-6 mr-1 inline" />}
						{elements}
					</span>
					{isOwner && slug && (
						<div className="ml-auto">
							<NavLocaleLink
								to={`/user/${currentHandle}/page/${slug}/edit`}
								className={({ isPending }) =>
									isPending ? "opacity-50" : "opacity-100"
								}
							>
								<SquarePen className="w-5 h-5" />
							</NavLocaleLink>
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
						voteIntent={voteIntent}
						addTranslationFormIntent={addTranslationFormIntent}
					/>
				)}
		</>
	);
}
