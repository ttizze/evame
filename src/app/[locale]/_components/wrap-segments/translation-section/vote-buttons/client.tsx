"use client";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Form from "next/form";
import { useLocale } from "next-intl";
import { memo, useActionState } from "react";
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
	const locale = useLocale();
	const [_voteState, action, isVoting] = useActionState(
		async (_prev: VoteTranslationActionResponse, formData: FormData) => {
			const res = await voteTranslationAction(_prev, formData);
			if (res.success) {
				onVoted?.();
			}
			return res;
		},
		{ success: false },
	);

	return (
		<span className="flex h-full justify-end items-center">
			<Form action={action}>
				<input name="userLocale" type="hidden" value={locale} />
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
