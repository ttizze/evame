"use client";
import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { useSegmentTranslations } from "@/app/[locale]/_hooks/use-segment-translations";
import type {
	TranslationWithInfo,
	TranslationWithUser,
} from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { AddTranslationForm } from "./add-translation-form/client";
import { TranslationListItem } from "./translation-list-item/client";
import { VoteButtons } from "./vote-buttons/client";

const INITIAL_DISPLAY_COUNT = 3;

interface AddAndVoteTranslationsProps {
	segmentId: number;
	open: boolean;
	bestTranslation: TranslationWithUser;
}

export function AddAndVoteTranslations({
	segmentId,
	open,
	bestTranslation,
}: AddAndVoteTranslationsProps) {
	const [showAll, setShowAll] = useState(false);
	const locale = useLocale();
	const { data, error, isLoading, mutate } = useSegmentTranslations({
		segmentId,
		locale,
		enabled: open,
		bestTranslationId: bestTranslation.id,
	});

	const alternativeTranslations = data?.translations ?? [];

	// SWRから取得したbestTranslationCurrentUserVoteとbestTranslationUserをbestTranslationとマージ
	const mergedBestTranslation: TranslationWithInfo = useMemo(() => {
		const user = data?.bestTranslationUser ?? bestTranslation.user;
		const currentUserVote = data?.bestTranslationCurrentUserVote ?? undefined;

		return {
			...bestTranslation,
			user,
			currentUserVote,
		} as TranslationWithInfo;
	}, [
		bestTranslation,
		data?.bestTranslationCurrentUserVote,
		data?.bestTranslationUser,
	]);

	const displayedTranslations = useMemo(() => {
		return showAll
			? alternativeTranslations
			: alternativeTranslations.slice(0, INITIAL_DISPLAY_COUNT);
	}, [alternativeTranslations, showAll]);

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
					href={`/user/${mergedBestTranslation.user?.handle}`}
				>
					<span className="text-sm text-gray-500 text-right flex items-center">
						by: {mergedBestTranslation.user?.name}
					</span>
				</Link>
				<VoteButtons
					key={`${mergedBestTranslation.id}-${mergedBestTranslation.point}-${mergedBestTranslation.currentUserVote?.isUpvote ?? "undefined"}`}
					onVoted={() => {
						void mutate();
					}}
					translation={mergedBestTranslation}
				/>
			</span>
			<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
				<Languages className="w-4 h-4 mr-1" /> Other translations
			</span>
			{displayedTranslations.map((displayedTranslation) => (
				<TranslationListItem
					key={displayedTranslation.id}
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
