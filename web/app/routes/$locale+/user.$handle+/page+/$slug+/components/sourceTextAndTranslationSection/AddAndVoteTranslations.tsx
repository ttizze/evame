import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { AddTranslationForm } from "~/routes/resources+/add-translation-form";
import { TranslationListItem } from "~/routes/resources+/translation-list-item";
import type { VoteIntent } from "~/routes/resources+/vote-buttons";
import type { SegmentWithTranslations } from "../../types";
const INITIAL_DISPLAY_COUNT = 3;

export function AddAndVoteTranslations({
	currentHandle,
	segmentWithTranslations,
	open,
	intent,
}: {
	currentHandle: string | undefined;
	segmentWithTranslations: SegmentWithTranslations;
	open: boolean;
	intent: VoteIntent;
}) {
	const [showAll, setShowAll] = useState(false);
	const { bestSegmentTranslationWithVote, segmentTranslationsWithVotes } =
		segmentWithTranslations;
	const alternativeTranslationsWithVotes = segmentTranslationsWithVotes.filter(
		(t) =>
			t.segmentTranslation.id !==
			bestSegmentTranslationWithVote?.segmentTranslation.id,
	);

	const displayedTranslations = useMemo(() => {
		return showAll
			? alternativeTranslationsWithVotes
			: alternativeTranslationsWithVotes.slice(0, INITIAL_DISPLAY_COUNT);
	}, [alternativeTranslationsWithVotes, showAll]);

	const hasMoreTranslations =
		alternativeTranslationsWithVotes.length > INITIAL_DISPLAY_COUNT;

	const toggleShowAll = () => setShowAll((prev) => !prev);

	if (!open) return null;

	return (
		<div className="w-full bg-background ">
			<div className="flex items-center justify-end text-gray-500 text-sm">
				<Languages className="w-4 h-4 mr-1" /> Other translations
			</div>
			<div>
				<div>
					{displayedTranslations.map((displayedTranslation) => (
						<TranslationListItem
							key={displayedTranslation.segmentTranslation.id}
							translation={displayedTranslation}
							currentHandle={currentHandle}
							intent={intent}
						/>
					))}
					{hasMoreTranslations && (
						<Button
							variant="link"
							className="mt-2 w-full text-sm"
							onClick={toggleShowAll}
						>
							{showAll ? (
								<>
									<ChevronUp size={16} className="mr-1" />
								</>
							) : (
								<>
									<ChevronDown size={16} className="mr-1" />
								</>
							)}
						</Button>
					)}
				</div>
				<div className="mt-4">
					<AddTranslationForm
						segmentId={segmentWithTranslations.segment.id}
						currentHandle={currentHandle}
					/>
				</div>
			</div>
		</div>
	);
}
