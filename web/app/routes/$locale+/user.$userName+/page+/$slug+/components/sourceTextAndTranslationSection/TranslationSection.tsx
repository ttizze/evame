import { LocaleLink } from "~/components/LocaleLink";
import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { useHydrated } from "remix-utils/use-hydrated";
import { VoteButtons } from "~/routes/resources+/vote-buttons";
import type { SourceTextWithTranslations } from "../../types";
import { sanitizeAndParseText } from "../../utils/sanitize-and-parse-text.client";
import { AddAndVoteTranslations } from "./AddAndVoteTranslations";

interface TranslationSectionProps {
	sourceTextWithTranslations: SourceTextWithTranslations;
	currentUserName: string | undefined;
}

export function TranslationSection({
	sourceTextWithTranslations,
	currentUserName,
}: TranslationSectionProps) {
	const isHydrated = useHydrated();
	const [isSelected, setIsSelected] = useState(false);

	const { bestTranslationWithVote } = sourceTextWithTranslations;
	if (!bestTranslationWithVote)
		return (
			<span className="flex items-center gap-2">
				<Plus size={24} />
				<Languages size={24} />
			</span>
		);
	const sanitizedAndParsedText = isHydrated
		? sanitizeAndParseText(bestTranslationWithVote.translateText.text)
		: bestTranslationWithVote.translateText.text;

	return (
		<div className={"group relative"}>
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
							to={`/user/${bestTranslationWithVote?.user.userName}`}
							className="!no-underline mr-2"
						>
							<p className="text-sm text-gray-500 text-right flex justify-end items-center">
								by: {bestTranslationWithVote?.user.displayName}
							</p>
						</LocaleLink>
						<VoteButtons translationWithVote={bestTranslationWithVote} />
					</div>
					<AddAndVoteTranslations
						currentUserName={currentUserName}
						sourceTextWithTranslations={sourceTextWithTranslations}
						open={isSelected}
					/>
				</>
			)}
		</div>
	);
}
