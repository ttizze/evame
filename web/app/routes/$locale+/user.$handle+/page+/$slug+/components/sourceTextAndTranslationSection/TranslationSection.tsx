import { Languages, Plus } from "lucide-react";
import { useState } from "react";
import { useHydrated } from "remix-utils/use-hydrated";
import { LocaleLink } from "~/components/LocaleLink";
import { VoteButtons } from "~/routes/resources+/vote-buttons";
import type { VoteIntent } from "~/routes/resources+/vote-buttons";
import type { SegmentWithTranslations } from "../../types";
import { sanitizeAndParseText } from "../../utils/sanitize-and-parse-text.client";
import { AddAndVoteTranslations } from "./AddAndVoteTranslations";
interface TranslationSectionProps {
	segmentWithTranslations: SegmentWithTranslations;
	currentHandle: string | undefined;
	intent: VoteIntent;
}

export function TranslationSection({
	segmentWithTranslations,
	currentHandle,
	intent,
}: TranslationSectionProps) {
	const isHydrated = useHydrated();
	const [isSelected, setIsSelected] = useState(false);

	const { bestSegmentTranslationWithVote } = segmentWithTranslations;
	if (!bestSegmentTranslationWithVote)
		return (
			<span className="flex items-center gap-2">
				<Plus size={24} />
				<Languages size={24} />
			</span>
		);
	const sanitizedAndParsedText = isHydrated
		? sanitizeAndParseText(
				bestSegmentTranslationWithVote.segmentTranslation.text,
			)
		: bestSegmentTranslationWithVote.segmentTranslation.text;

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
							to={`/user/${bestSegmentTranslationWithVote?.segmentTranslation.user.handle}`}
							className="!no-underline mr-2"
						>
							<p className="text-sm text-gray-500 text-right flex justify-end items-center">
								by:{" "}
								{bestSegmentTranslationWithVote?.segmentTranslation.user.name}
							</p>
						</LocaleLink>
						<VoteButtons
							translationWithVote={bestSegmentTranslationWithVote}
							intent={intent}
						/>
					</div>
					<AddAndVoteTranslations
						currentHandle={currentHandle}
						segmentWithTranslations={segmentWithTranslations}
						open={isSelected}
						intent={intent}
					/>
				</>
			)}
		</span>
	);
}
