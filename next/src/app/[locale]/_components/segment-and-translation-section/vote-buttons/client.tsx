"use client";
import type { TargetContentType } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { BaseTranslation } from "@/app/[locale]/types";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Form from "next/form";
import { memo } from "react";
import { useActionState } from "react";
import {
	type VoteTranslationActionResponse,
	voteTranslationAction,
} from "./action";
import { VoteButton } from "./vote-button";

interface VoteButtonsProps {
	translation: BaseTranslation;
	targetContentType: TargetContentType;
}

export const VoteButtons = memo(function VoteButtons({
	translation,
	targetContentType,
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
					type="hidden"
					name="targetContentType"
					value={targetContentType}
				/>
				<input
					type="hidden"
					name="segmentTranslationId"
					value={translation.id}
				/>
				<span className="flex h-8">
					<VoteButton
						type="upvote"
						isActive={
							voteState.success ? voteState.data?.isUpvote === true : false
						}
						isVoting={isVoting}
						voteCount={voteState.success ? voteState.data?.point : 0}
					>
						{({ iconClass }) => <ThumbsUp className={iconClass} />}
					</VoteButton>
					<VoteButton
						type="downvote"
						isActive={
							voteState.success ? voteState.data?.isUpvote === false : false
						}
						isVoting={isVoting}
					>
						{({ iconClass }) => <ThumbsDown className={iconClass} />}
					</VoteButton>
				</span>
			</Form>
		</span>
	);
});
