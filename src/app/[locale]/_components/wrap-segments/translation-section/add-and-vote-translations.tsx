import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useMemo, useState } from "react";
import type { SegmentBundle } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { AddTranslationForm } from "./add-translation-form/client";
import { TranslationListItem } from "./translation-list-item/client";

const INITIAL_DISPLAY_COUNT = 3;

export function AddAndVoteTranslations({
	segmentBundle,
	open,
}: {
	segmentBundle: SegmentBundle;
	open: boolean;
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
			{displayedTranslations.map((displayedTranslation) => (
				<TranslationListItem
					key={displayedTranslation.id}
					targetContentType={segmentBundle.parentType}
					translation={displayedTranslation}
				/>
			))}
			{hasMoreTranslations && (
				<Button
					className="mt-2 w-full text-sm"
					onClick={toggleShowAll}
					variant="link"
				>
					{showAll ? (
						<ChevronUp className="mr-1" size={16} />
					) : (
						<ChevronDown className="mr-1" size={16} />
					)}
				</Button>
			)}
			<span className="mt-4">
				<AddTranslationForm
					segmentId={segmentBundle.segment.id}
					targetContentType={segmentBundle.parentType}
				/>
			</span>
		</span>
	);
}
