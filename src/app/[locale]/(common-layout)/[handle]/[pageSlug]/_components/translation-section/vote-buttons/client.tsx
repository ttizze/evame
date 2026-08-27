"use client";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { getScriptureCopy } from "@/components/scripture/copy";
import { buildLoginHref } from "@/components/scripture/login-link";
import type {
	SubmitTranslationVote,
	TranslationCandidate,
	VoteResult,
} from "@/components/scripture/types";
import { VoteButton } from "./vote-button";

export function VoteButtons({
	authenticated,
	loginHref,
	onVoted,
	onVote,
	translation,
	locale,
}: {
	authenticated: boolean;
	loginHref?: string;
	onVoted?: () => void;
	onVote: SubmitTranslationVote;
	translation: TranslationCandidate;
	locale: string;
}) {
	const labels = getScriptureCopy(locale);
	const resolvedLoginHref = loginHref ?? buildLoginHref(locale, `/${locale}`);
	const [serverState, setServerState] = useState<VoteResult>({
		voted: translation.votedByViewer,
		voteCount: translation.voteCount,
	});
	const [isVoting, setIsVoting] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [hasError, setHasError] = useState(false);

	async function handleVote(newVote: boolean) {
		if (!authenticated) {
			setHasError(false);
			setNotice(labels.voteLogin);
			return;
		}

		setHasError(false);
		setNotice(null);
		setIsVoting(true);
		try {
			const currentVote = serverState.voted === newVote ? newVote : undefined;
			const nextState = await onVote({
				candidateId: translation.id,
				...(currentVote === undefined
					? { value: newVote ? "up" : "down" }
					: { currentVote, value: "remove" }),
			});
			setServerState(nextState);
			onVoted?.();
		} catch {
			setHasError(true);
			setNotice(labels.voteError);
		} finally {
			setIsVoting(false);
		}
	}

	return (
		<span className="flex h-full justify-end items-center">
			<span className="flex h-8">
				<VoteButton
					ariaLabel={
						isVoting
							? labels.saving
							: serverState.voted === true
								? labels.removeUp
								: labels.up
					}
					isActive={serverState.voted === true}
					isVoting={isVoting}
					onClick={() => handleVote(true)}
					type="upvote"
					voteCount={labels.voteCount(serverState.voteCount)}
				>
					{({ iconClass }) => <ThumbsUp className={iconClass} />}
				</VoteButton>
				<VoteButton
					ariaLabel={
						isVoting
							? labels.saving
							: serverState.voted === false
								? labels.removeDown
								: labels.down
					}
					isActive={serverState.voted === false}
					isVoting={isVoting}
					onClick={() => handleVote(false)}
					type="downvote"
				>
					{({ iconClass }) => <ThumbsDown className={iconClass} />}
				</VoteButton>
			</span>
			{notice ? (
				<span
					aria-live="polite"
					className={
						hasError ? "text-sm text-destructive" : "text-sm text-gray-500"
					}
					role={hasError ? "alert" : "status"}
				>
					{!authenticated ? (
						<a
							className="underline underline-offset-4"
							href={resolvedLoginHref}
						>
							{notice}
						</a>
					) : (
						notice
					)}
				</span>
			) : null}
		</span>
	);
}
