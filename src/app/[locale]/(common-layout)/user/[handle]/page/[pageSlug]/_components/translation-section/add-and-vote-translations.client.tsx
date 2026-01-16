"use client";
import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { AddTranslationForm } from "./add-translation-form/client";
import { useSegmentTranslations } from "./hooks/use-segment-translations";
import { TranslationListItem } from "./translation-list-item/client";
import { VoteButtons } from "./vote-buttons/client";

const INITIAL_DISPLAY_COUNT = 3;

interface AddAndVoteTranslationsProps {
	segmentId: number;
	open: boolean;
}

export function AddAndVoteTranslations({
	segmentId,
	open,
}: AddAndVoteTranslationsProps) {
	const [showAll, setShowAll] = useState(false);
	const userLocale = useLocale();
	const { data, error, isLoading, mutate } = useSegmentTranslations({
		segmentId,
		userLocale,
		enabled: open,
	});

	const translations = data ?? [];
	const bestTranslation = translations[0];
	const alternativeTranslations = translations.slice(1);

	const displayedTranslations = showAll
		? alternativeTranslations
		: alternativeTranslations.slice(0, INITIAL_DISPLAY_COUNT);

	const hasMoreTranslations =
		alternativeTranslations.length > INITIAL_DISPLAY_COUNT;

	const toggleShowAll = () => setShowAll((prev) => !prev);

	if (!open) return null;

	if (isLoading) {
		return (
			<span className="w-full">
				<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
					<Languages className="w-4 h-4 mr-1" /> Loading translations...
				</span>
			</span>
		);
	}

	if (error) {
		return (
			<span className="w-full">
				<span className="flex mt-2 items-center justify-end text-red-500 text-sm">
					Failed to load translations
				</span>
			</span>
		);
	}

	return (
		<span className="w-full ">
			<span className="flex items-center justify-end gap-2">
				<Link
					className="no-underline!"
					href={`/user/${bestTranslation.userHandle}`}
				>
					<span className="text-sm text-gray-500 text-right flex items-center">
						by: {bestTranslation.userName}
					</span>
				</Link>
				<VoteButtons
					key={bestTranslation.id}
					onVoted={() => {
						void mutate();
					}}
					translation={bestTranslation}
				/>
			</span>
			<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
				<Languages className="w-4 h-4 mr-1" /> Other translations
			</span>
			{displayedTranslations.map((displayedTranslation) => (
				<TranslationListItem
					key={displayedTranslation.id}
					onDeleted={() => {
						void mutate();
					}}
					onVoted={() => {
						void mutate();
					}}
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
				<AddTranslationForm onTranslationAdded={mutate} segmentId={segmentId} />
			</span>
		</span>
	);
}
