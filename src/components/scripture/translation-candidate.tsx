import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getScriptureCopy } from "./copy";
import { TranslationVote } from "./translation-vote";
import type { SubmitTranslationVote, TranslationCandidate } from "./types";

type TranslationCandidateProps = {
	candidate: TranslationCandidate;
	position: number;
	authenticated: boolean;
	onVote: SubmitTranslationVote;
	onDeleteTranslation?: (translationId: string) => Promise<void>;
	locale?: string;
	loginHref?: string;
};

export function TranslationCandidateCard({
	candidate,
	position,
	authenticated,
	onVote,
	onDeleteTranslation,
	locale = "ja",
	loginHref,
}: TranslationCandidateProps) {
	const labels = getScriptureCopy(locale);
	const [deleting, setDeleting] = useState(false);
	const [deleted, setDeleted] = useState(false);
	const canDelete =
		authenticated &&
		candidate.ownedByViewer &&
		onDeleteTranslation !== undefined;

	async function handleDelete() {
		if (!onDeleteTranslation) return;
		setDeleting(true);
		try {
			await onDeleteTranslation(candidate.id);
			setDeleted(true);
		} finally {
			setDeleting(false);
		}
	}

	if (deleted) return null;

	return (
		<li className="mt-1 block pl-4" data-slot="translation-list-item">
			<div className="flex items-start justify-between gap-3">
				<span aria-hidden="true" className="w-5 shrink-0 text-2xl">
					•
				</span>
				<p
					className="min-w-0 whitespace-pre-wrap leading-relaxed"
					lang={candidate.locale ?? locale}
				>
					{candidate.text}
				</p>
				{canDelete ? (
					<Button
						aria-label={labels.delete}
						className="h-8 w-8 shrink-0 p-0"
						disabled={deleting}
						onClick={handleDelete}
						type="button"
						variant="ghost"
					>
						<Trash2
							aria-hidden="true"
							className="h-4 w-4 text-muted-foreground"
						/>
					</Button>
				) : null}
			</div>
			<span className="sr-only">
				{labels.candidate} {position}, {labels.publicCandidate}
			</span>
			<div className="flex flex-wrap items-center justify-end gap-2">
				<p className="mr-auto text-sm text-muted-foreground">
					{labels.by} {candidate.userName} (@{candidate.userHandle})
					{candidate.userIsAi ? (
						<span className="ml-2 font-medium">({labels.aiLabel})</span>
					) : null}
				</p>
				<TranslationVote
					authenticated={authenticated}
					candidateId={candidate.id}
					locale={locale}
					loginHref={loginHref}
					onVote={onVote}
					voteCount={candidate.voteCount}
					votedByViewer={candidate.votedByViewer}
				/>
			</div>
		</li>
	);
}
