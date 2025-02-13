"use client";
import type { SegmentTranslationWithVote } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Form from "next/form";
import { memo } from "react";
import { useActionState } from "react";
import {
	type VoteTranslationActionResponse,
	voteTranslationAction,
} from "./action";
import type { VoteTarget } from "./constants";
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
			isUpvote: translationWithVote.translationVote?.isUpvote,
			point: translationWithVote.segmentTranslation.point,
		},
	});
	return (
		<span className="flex justify-end items-center">
			<span className="space-x-2 flex">
				<Form action={voteAction}>
					<input type="hidden" name="voteTarget" value={voteTarget} />
					<input
						type="hidden"
						name="segmentTranslationId"
						value={translationWithVote.segmentTranslation.id}
					/>
					<Button
						type="submit"
						name="isUpvote"
						value="true"
						variant="ghost"
						size="sm"
						disabled={isVoting}
					>
						<ThumbsUp
							className={`mr-2 h-4 w-4 transition-all duration-300 ${
								translationWithVote.translationVote?.isUpvote === true && "[&>path]:fill-primary"
							} ${isVoting && "animate-bounce"}`}
						/>
						{voteState.data?.point}
					</Button>
					<Button
						type="submit"
						name="isUpvote"
						value="false"
						variant="ghost"
						size="sm"
						disabled={isVoting}
					>
						<ThumbsDown
							className={`mr-2 h-4 w-4 transition-all duration-300 ${
								translationWithVote.translationVote?.isUpvote === false && "[&>path]:fill-primary"
							} ${isVoting && "animate-bounce"}`}
						/>
					</Button>
				</Form>
			</span>
		</span>
	);
});
