import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { useHydrated } from "remix-utils/use-hydrated";
import { LocaleLink } from "~/components/LocaleLink";
import { VoteButtons } from "~/routes/resources+/vote-buttons";
import type { PageSegmentWithTranslations } from "../../types";
import { sanitizeAndParseText } from "../../utils/sanitize-and-parse-text.client";
import { AddAndVoteTranslations } from "./AddAndVoteTranslations";

interface TranslationSectionProps {
	pageSegmentWithTranslations: PageSegmentWithTranslations;
	currentHandle: string | undefined;
}

export function TranslationSection({
	pageSegmentWithTranslations,
	currentHandle,
}: TranslationSectionProps) {
	const isHydrated = useHydrated();
	const [isSelected, setIsSelected] = useState(false);

	const { bestPageSegmentTranslationWithVote } = pageSegmentWithTranslations;
	if (!bestPageSegmentTranslationWithVote)
		return (
			<span className="flex items-center gap-2">
				<Plus size={24} />
				<Languages size={24} />
			</span>
		);
	const sanitizedAndParsedText = isHydrated
		? sanitizeAndParseText(
				bestPageSegmentTranslationWithVote.pageSegmentTranslation.text,
			)
		: bestPageSegmentTranslationWithVote.pageSegmentTranslation.text;

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
					<div className="flex items-center justify-end">
						<LocaleLink
							to={`/user/${bestPageSegmentTranslationWithVote?.pageSegmentTranslation.user.handle}`}
							className="!no-underline mr-2"
						>
							<p className="text-sm text-gray-500 text-right flex justify-end items-center">
								by:{" "}
								{
									bestPageSegmentTranslationWithVote?.pageSegmentTranslation
										.user.name
								}
							</p>
						</LocaleLink>
						<VoteButtons
							translationWithVote={bestPageSegmentTranslationWithVote}
						/>
					</div>
					<AddAndVoteTranslations
						currentHandle={currentHandle}
						pageSegmentWithTranslations={pageSegmentWithTranslations}
						open={isSelected}
					/>
				</>
			)}
		</span>
	);
}
