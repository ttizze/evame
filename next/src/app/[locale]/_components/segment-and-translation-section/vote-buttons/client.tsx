"use client";
import type { SegmentTranslationWithVote } from "@/app/[locale]/types";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Form from "next/form";
import { memo } from "react";
import { useActionState } from "react";
import {
	type VoteTranslationActionResponse,
	voteTranslationAction,
} from "./action";
import type { VoteTarget } from "./constants";
import { VoteButton } from "./vote-button";

interface VoteButtonsProps {
	translationWithVote: SegmentTranslationWithVote;
	voteTarget: VoteTarget;
}

export const VoteButtons = memo(function VoteButtons({
	translationWithVote,
	voteTarget,
}: VoteButtonsProps) {
	const [voteState, voteAction, isVoting] = useActionState<
		VoteTranslationActionResponse,
		FormData
	>(voteTranslationAction, {
		success: false,
		data: {
			isUpvote: translationWithVote.translationCurrentUserVote?.isUpvote,
			point: translationWithVote.point,
		},
	});
	return (
		<span className="flex h-full justify-end items-center">
			<Form action={voteAction}>
				<input type="hidden" name="voteTarget" value={voteTarget} />
				<input
					type="hidden"
					name="segmentTranslationId"
					value={translationWithVote.id}
				/>
				<span className="flex h-8">
					<VoteButton
						type="upvote"
						isActive={voteState.data?.isUpvote === true}
						isVoting={isVoting}
						voteCount={voteState.data?.point}
					>
						{({ iconClass }) => <ThumbsUp className={iconClass} />}
					</VoteButton>
					<VoteButton
						type="downvote"
						isActive={voteState.data?.isUpvote === false}
						isVoting={isVoting}
					>
						{({ iconClass }) => <ThumbsDown className={iconClass} />}
					</VoteButton>
				</span>
			</Form>
		</span>
	);
});
