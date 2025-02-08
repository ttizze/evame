"use client";
import { sanitizeAndParseText } from "@/app/[locale]/lib/sanitize-and-parse-text.client";
import type { SegmentWithTranslations } from "@/app/[locale]/types";
import type {
	AddTranslationFormTarget,
	VoteTarget,
} from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import { NavigationLink } from "@/components/navigation-link";
import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { AddAndVoteTranslations } from "./add-and-vote-translations";
import { VoteButtons } from "./vote-buttons";

interface TranslationSectionProps {
	segmentWithTranslations: SegmentWithTranslations;
	currentHandle: string | undefined;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export function TranslationSection({
	segmentWithTranslations,
	currentHandle,
	voteTarget,
	addTranslationFormTarget,
}: TranslationSectionProps) {
	const [isSelected, setIsSelected] = useState(false);

	const { bestSegmentTranslationWithVote } = segmentWithTranslations;
	if (!bestSegmentTranslationWithVote)
		return (
			<span className="flex items-center gap-2">
				<Plus size={24} />
				<Languages size={24} />
			</span>
		);
	const sanitizedAndParsedText = sanitizeAndParseText(
		bestSegmentTranslationWithVote.segmentTranslation.text,
	);
	return (
		<span className={"group relative"}>
			<span
				className="notranslate inline-block py-2 text-gray-700 dark:text-gray-200"
				onMouseUp={(e) => {
					if (window.getSelection()?.toString()) return;
					if (e.button === 2) return;
					setIsSelected((prev) => !prev);
				}}
			>
				{sanitizedAndParsedText}
			</span>
			{isSelected && (
				<>
					<span className="flex items-center justify-end">
						<NavigationLink
							href={`/user/${bestSegmentTranslationWithVote?.segmentTranslation.user.handle}`}
							className="!no-underline mr-2"
						>
							<span className="text-sm text-gray-500 text-right flex justify-end items-center">
								by:{" "}
								{bestSegmentTranslationWithVote?.segmentTranslation.user.name}
							</span>
						</NavigationLink>
						<VoteButtons
							translationWithVote={bestSegmentTranslationWithVote}
							voteTarget={voteTarget}
						/>
					</span>
					<AddAndVoteTranslations
						currentHandle={currentHandle}
						segmentWithTranslations={segmentWithTranslations}
						open={isSelected}
						voteTarget={voteTarget}
						addTranslationFormTarget={addTranslationFormTarget}
					/>
				</>
			)}
		</span>
	);
}
