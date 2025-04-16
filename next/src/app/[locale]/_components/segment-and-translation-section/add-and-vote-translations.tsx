import type { AddTranslationFormTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { SegmentWithTranslations } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useMemo, useState } from "react";
import { AddTranslationForm } from "./add-translation-form";
import { TranslationListItem } from "./translation-list-item";
import type { VoteTarget } from "./vote-buttons/constants";
const INITIAL_DISPLAY_COUNT = 3;

export function AddAndVoteTranslations({
	currentHandle,
	segmentWithTranslations,
	open,
	voteTarget,
	addTranslationFormTarget,
}: {
	currentHandle: string | undefined;
	segmentWithTranslations: SegmentWithTranslations;
	open: boolean;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
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
		<span className="w-full ">
			<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
				<Languages className="w-4 h-4 mr-1" /> Other translations
			</span>
			<>
				{displayedTranslations.map((displayedTranslation) => (
					<TranslationListItem
						key={displayedTranslation.segmentTranslation.id}
						translation={displayedTranslation}
						currentHandle={currentHandle}
						voteTarget={voteTarget}
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
			</>
			<span className="mt-4">
				<AddTranslationForm
					segmentId={segmentWithTranslations.id}
					currentHandle={currentHandle}
					addTranslationFormTarget={addTranslationFormTarget}
				/>
			</span>
		</span>
	);
}
