"use client";
import type { ActionState } from "@/app/types";
import { Button } from "@/components/ui/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { memo } from "react";
import { useActionState } from "react";
import { voteTranslationAction } from "./action";
import type { VoteTarget } from "./constants";

export const VoteButton = memo(function VoteButton({
	isUpvote,
	segmentTranslationId,
	point,
	iconClass,
	voteTarget,
}: {
	isUpvote: boolean;
	segmentTranslationId: number;
	point?: number;
	iconClass: string;
	voteTarget: VoteTarget;
}) {
	const Icon = isUpvote ? ThumbsUp : ThumbsDown;
	const [voteState, voteAction, isVoting] = useActionState<
		ActionState,
		FormData
	>(voteTranslationAction, { success: false });
	return (
		<form action={voteAction} className="inline">
			<input type="hidden" name="voteTarget" value={voteTarget} />
			<input
				type="hidden"
				name="segmentTranslationId"
				value={segmentTranslationId}
			/>
			<Button
				variant="ghost"
				size="sm"
				type="submit"
				name="isUpvote"
				value={isUpvote.toString()}
				disabled={isVoting}
			>
				<Icon className={`${iconClass} ${isVoting && "animate-bounce"}`} />
				{isUpvote && point}
			</Button>
		</form>
	);
});
