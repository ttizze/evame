import type { AddTranslationFormTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { SegmentBundle } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useMemo, useState } from "react";
import { AddTranslationForm } from "./add-translation-form";
import { TranslationListItem } from "./translation-list-item";
import type { VoteTarget } from "./vote-buttons/constants";
const INITIAL_DISPLAY_COUNT = 3;

export function AddAndVoteTranslations({
	currentHandle,
	segmentBundle,
	open,
	voteTarget,
	addTranslationFormTarget,
}: {
	currentHandle: string | undefined;
	segmentBundle: SegmentBundle;
	open: boolean;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}) {
	const [showAll, setShowAll] = useState(false);
	const { best, translations } = segmentBundle;
	const alternativeTranslations = translations.filter((t) => t.id !== best?.id);

	const displayedTranslations = useMemo(() => {
		return showAll
			? alternativeTranslations
			: alternativeTranslations.slice(0, INITIAL_DISPLAY_COUNT);
	}, [alternativeTranslations, showAll]);

	const hasMoreTranslations =
		alternativeTranslations.length > INITIAL_DISPLAY_COUNT;

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
						key={displayedTranslation.id}
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
					segmentId={segmentBundle.segment.id}
					currentHandle={currentHandle}
					addTranslationFormTarget={addTranslationFormTarget}
				/>
			</span>
		</span>
	);
}
