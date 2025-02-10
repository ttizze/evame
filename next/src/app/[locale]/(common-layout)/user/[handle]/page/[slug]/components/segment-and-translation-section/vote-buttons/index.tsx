"use client";
import type { SegmentTranslationWithVote } from "@/app/[locale]/types";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";
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
	const buttonClasses = useMemo(
		() => ({
			upVote: cn(
				"mr-2 h-4 w-4 transition-all duration-300",
				translationWithVote.translationVote?.isUpvote === true &&
					"[&>path]:fill-primary",
			),
			downVote: cn(
				"mr-2 h-4 w-4 transition-all duration-300",
				translationWithVote.translationVote?.isUpvote === false &&
					"[&>path]:fill-primary",
			),
		}),
		[translationWithVote.translationVote?.isUpvote],
	);

	return (
		<span className="flex justify-end items-center">
			<span className="space-x-2 flex">
				<VoteButton
					isUpvote={true}
					segmentTranslationId={translationWithVote.segmentTranslation.id}
					point={translationWithVote.segmentTranslation.point}
					iconClass={buttonClasses.upVote}
					voteTarget={voteTarget}
				/>
				<VoteButton
					isUpvote={false}
					segmentTranslationId={translationWithVote.segmentTranslation.id}
					point={translationWithVote.segmentTranslation.point}
					iconClass={buttonClasses.downVote}
					voteTarget={voteTarget}
				/>
			</span>
		</span>
	);
});
