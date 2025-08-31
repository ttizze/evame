"use client";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Form from "next/form";
import { memo, useActionState, useEffect } from "react";
import type { TranslationWithInfo } from "@/app/[locale]/types";
import {
	type VoteTranslationActionResponse,
	voteTranslationAction,
} from "./action";
import { VoteButton } from "./vote-button";

interface VoteButtonsProps {
	translation: TranslationWithInfo;
	onVoted?: () => void;
}

export const VoteButtons = memo(function VoteButtons({
	translation,
	onVoted,
}: VoteButtonsProps) {
	const [voteState, voteAction, isVoting] = useActionState<
		VoteTranslationActionResponse,
		FormData
	>(voteTranslationAction, {
		success: false,
	});

	// Fire callback when the action has completed successfully
	useEffect(() => {
		if (voteState.success && !isVoting) onVoted?.();
	}, [voteState.success, isVoting, onVoted]);
	return (
		<span className="flex h-full justify-end items-center">
			<Form action={voteAction}>
				<input
					name="segmentTranslationId"
					type="hidden"
					value={translation.id}
				/>
				<span className="flex h-8">
					<VoteButton
						isActive={translation.currentUserVote?.isUpvote}
						isVoting={isVoting}
						type="upvote"
						voteCount={translation.point}
					>
						{({ iconClass }) => <ThumbsUp className={iconClass} />}
					</VoteButton>
					<VoteButton
						isActive={translation.currentUserVote?.isUpvote === false}
						isVoting={isVoting}
						type="downvote"
					>
						{({ iconClass }) => <ThumbsDown className={iconClass} />}
					</VoteButton>
				</span>
			</Form>
		</span>
	);
});
