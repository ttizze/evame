"use client";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";
import { VoteButton } from "./vote-button";
import type { SegmentTranslationWithVote } from "@/app/[locale]/types";
import { voteAction, type VoteIntent } from "./action";
import { useTransition } from "react";
import { useState } from "react";
interface VoteButtonsProps {
	translationWithVote: SegmentTranslationWithVote;
	voteIntent: VoteIntent;
}

export const VoteButtons = memo(function VoteButtons({
	translationWithVote,
	voteIntent,
}: VoteButtonsProps) {
	const [isPending, startTransition] = useTransition();
	const [optimisticVote, setOptimisticVote] = useState(translationWithVote.translationVote);
	const [optimisticPoint, setOptimisticPoint] = useState(translationWithVote.segmentTranslation.point);

	const buttonClasses = useMemo(
		() => ({
			upVote: cn(
				"mr-2 h-4 w-4 transition-all duration-300",
				optimisticVote?.isUpvote === true && "[&>path]:fill-primary",
				isPending && "animate-bounce"
			),
			downVote: cn(
				"mr-2 h-4 w-4 transition-all duration-300",
				optimisticVote?.isUpvote === false && "[&>path]:fill-primary",
				isPending && "animate-bounce"
			),
		}),
		[optimisticVote?.isUpvote, isPending]
	);

	const handleVoteClick = (isUpvote: boolean) => {
		// 楽観的 UI 更新の計算
		const currentPoint = translationWithVote.segmentTranslation.point;
		const currentVote = translationWithVote.translationVote;
		let newPoint: number;
		if (currentVote) {
			if (currentVote.isUpvote === isUpvote) {
				newPoint = isUpvote ? currentPoint - 1 : currentPoint + 1;
			} else {
				newPoint = isUpvote ? currentPoint + 2 : currentPoint - 2;
			}
		} else {
			newPoint = isUpvote ? currentPoint + 1 : currentPoint - 1;
		}
		// TODO 暫定対処
		setOptimisticVote({ isUpvote, id: 0, userId: "", translationId: 0, createdAt: new Date(), updatedAt: new Date() });
		setOptimisticPoint(newPoint);

		// フォームデータの作成
		const formData = new FormData();
		formData.append("segmentTranslationId", translationWithVote.segmentTranslation.id.toString());
		formData.append("intent", voteIntent);
		formData.append("isUpvote", isUpvote.toString());

		startTransition(async () => {
			try {
				await voteAction(formData);
			} catch (error) {
				// エラー発生時は楽観的更新を取り消す
				setOptimisticVote(translationWithVote.translationVote);
				setOptimisticPoint(translationWithVote.segmentTranslation.point);
			}
		});
	};
	return (
		<div className="flex justify-end items-center">
			<div className="space-x-2 flex">
				<VoteButton
					isUpvote={true}
					isDisabled={isPending}
					point={optimisticPoint}
					iconClass={buttonClasses.upVote}
					onClick={() => handleVoteClick(true)}
				/>
				<VoteButton
					isUpvote={false}
					isDisabled={isPending}
					iconClass={buttonClasses.downVote}
					onClick={() => handleVoteClick(false)}
				/>
			</div>
		</div>
	);
});
