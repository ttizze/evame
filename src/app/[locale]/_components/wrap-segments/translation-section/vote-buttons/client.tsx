"use client";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Form from "next/form";
import { memo, useActionState } from "react";
import type { TranslationWithInfo } from "@/app/[locale]/types";
import {
	type VoteTranslationActionResponse,
	voteTranslationAction,
} from "./action";
import { VoteButton } from "./vote-button";

interface VoteButtonsProps {
	translation: TranslationWithInfo;
}

export const VoteButtons = memo(function VoteButtons({
	translation,
}: VoteButtonsProps) {
	const [voteState, voteAction, isVoting] = useActionState<
		VoteTranslationActionResponse,
		FormData
	>(voteTranslationAction, {
		success: true,
		data: {
			isUpvote: translation.currentUserVote?.isUpvote,
			point: translation.point,
		},
	});
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
						isActive={
							voteState.success ? voteState.data?.isUpvote === true : false
						}
						isVoting={isVoting}
						type="upvote"
						voteCount={voteState.success ? voteState.data?.point : 0}
					>
						{({ iconClass }) => <ThumbsUp className={iconClass} />}
					</VoteButton>
					<VoteButton
						isActive={
							voteState.success ? voteState.data?.isUpvote === false : false
						}
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
