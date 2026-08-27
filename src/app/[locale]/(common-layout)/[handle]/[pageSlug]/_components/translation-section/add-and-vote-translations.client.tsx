"use client";
import { ChevronDown, ChevronUp, Languages, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getScriptureCopy } from "@/components/scripture/copy";
import type {
	SubmitTranslationVote,
	TranslationCandidate,
} from "@/components/scripture/types";
import { Button } from "@/components/ui/button";
import { AddTranslationForm } from "./add-translation-form/client";
import { TranslationListItem } from "./translation-list-item/client";
import { VoteButtons } from "./vote-buttons/client";

const INITIAL_DISPLAY_COUNT = 3;

export function AddAndVoteTranslations({
	authenticated,
	availableLocales,
	defaultLocale,
	loginHref,
	onCreateTranslation,
	onDeleteTranslation,
	onVote,
	open,
	translations,
	locale,
}: {
	authenticated: boolean;
	availableLocales: Array<{ code: string; label: string }>;
	defaultLocale: string;
	loginHref?: string;
	onCreateTranslation?: (input: {
		locale: string;
		text: string;
	}) => Promise<TranslationCandidate>;
	onDeleteTranslation?: (translationId: string) => Promise<void>;
	onVote: SubmitTranslationVote;
	open: boolean;
	translations: TranslationCandidate[];
	locale: string;
}) {
	const [showAll, setShowAll] = useState(false);
	const [isDeletingBest, setIsDeletingBest] = useState(false);
	const [visibleTranslations, setVisibleTranslations] =
		useState<TranslationCandidate[]>(translations);
	const labels = getScriptureCopy(locale);

	useEffect(() => {
		setVisibleTranslations(translations);
	}, [translations]);

	function handleTranslationAdded(translation: TranslationCandidate) {
		setVisibleTranslations((current) =>
			current.some((item) => item.id === translation.id)
				? current
				: [...current, translation],
		);
	}

	function handleTranslationDeleted(translationId: string) {
		setVisibleTranslations((current) =>
			current.filter((item) => item.id !== translationId),
		);
	}

	if (!open) return null;

	const bestTranslation = visibleTranslations[0];
	if (!bestTranslation) {
		return (
			<span className="w-full">
				<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
					{labels.noTranslations}
				</span>
				{onCreateTranslation ? (
					<AddTranslationForm
						authenticated={authenticated}
						availableLocales={availableLocales}
						defaultLocale={defaultLocale}
						loginHref={loginHref}
						onCreateTranslation={onCreateTranslation}
						onTranslationAdded={handleTranslationAdded}
						uiLocale={locale}
					/>
				) : null}
			</span>
		);
	}

	const alternativeTranslations = visibleTranslations.slice(1);
	const displayedTranslations = showAll
		? alternativeTranslations
		: alternativeTranslations.slice(0, INITIAL_DISPLAY_COUNT);
	const hasMoreTranslations =
		alternativeTranslations.length > INITIAL_DISPLAY_COUNT;
	const canDeleteBest =
		authenticated &&
		bestTranslation.ownedByViewer &&
		onDeleteTranslation !== undefined;

	async function deleteBestTranslation() {
		if (!onDeleteTranslation) return;
		setIsDeletingBest(true);
		try {
			await onDeleteTranslation(bestTranslation.id);
			handleTranslationDeleted(bestTranslation.id);
		} finally {
			setIsDeletingBest(false);
		}
	}

	return (
		<span className="w-full ">
			<li className="mt-1 block list-none pl-4">
				<span className="flex items-start justify-between">
					<span>{bestTranslation.text}</span>
					{canDeleteBest ? (
						<Button
							aria-label={labels.delete}
							className="h-8 w-8 p-0"
							disabled={isDeletingBest}
							onClick={deleteBestTranslation}
							type="button"
							variant="ghost"
						>
							<Trash2 className="h-4 w-4 text-gray-400" />
						</Button>
					) : null}
				</span>
				<span className="flex items-center justify-end">
					<span className="text-sm text-gray-500 text-right flex items-center mr-2">
						{labels.by} {bestTranslation.userName} (@
						{bestTranslation.userHandle})
						{bestTranslation.userIsAi ? (
							<span className="ml-2 font-medium">({labels.aiLabel})</span>
						) : null}
					</span>
					<VoteButtons
						authenticated={authenticated}
						locale={locale}
						loginHref={loginHref}
						onVote={onVote}
						translation={bestTranslation}
					/>
				</span>
			</li>
			<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
				<Languages className="w-4 h-4 mr-1" /> {labels.otherTranslations}
			</span>
			{displayedTranslations.map((displayedTranslation) => (
				<TranslationListItem
					authenticated={authenticated}
					key={displayedTranslation.id}
					locale={locale}
					loginHref={loginHref}
					onDeleted={() => handleTranslationDeleted(displayedTranslation.id)}
					onDeleteTranslation={onDeleteTranslation}
					onVote={onVote}
					translation={displayedTranslation}
				/>
			))}
			{hasMoreTranslations && (
				<Button
					aria-expanded={showAll}
					className="mt-2 w-full text-sm"
					onClick={() => setShowAll((previous) => !previous)}
					type="button"
					variant="link"
				>
					{showAll ? (
						<ChevronUp className="mr-1" size={16} />
					) : (
						<ChevronDown className="mr-1" size={16} />
					)}
					{showAll ? labels.collapse : labels.showAll}
				</Button>
			)}
			{onCreateTranslation ? (
				<span className="mt-4">
					<AddTranslationForm
						authenticated={authenticated}
						availableLocales={availableLocales}
						defaultLocale={defaultLocale}
						fieldIdPrefix={`translation-${bestTranslation.id}`}
						loginHref={loginHref}
						onCreateTranslation={onCreateTranslation}
						onTranslationAdded={handleTranslationAdded}
						uiLocale={locale}
					/>
				</span>
			) : null}
		</span>
	);
}
