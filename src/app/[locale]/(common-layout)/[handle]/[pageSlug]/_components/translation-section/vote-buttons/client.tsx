"use client";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { type FormEvent, useOptimistic, useState, useTransition } from "react";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import type { ActionResponse } from "@/app/types";
import { VoteButton } from "./vote-button";

interface VoteButtonsProps {
	translation: SegmentTranslation;
	onVoted?: () => void;
}

type VoteState = {
	point: number;
	isUpvote: boolean | undefined;
};

type VoteResponse = ActionResponse<{ isUpvote?: boolean; point: number }>;

/**
 * 投票の楽観的更新を計算
 * - 同じボタンをクリック: 投票キャンセル（point -1 or +1, isUpvote = undefined）
 * - 未投票状態でクリック: 新規投票（point +1 or -1, isUpvote = true/false）
 * - 反対ボタンをクリック: 投票変更（point +2 or -2, isUpvote反転）
 */
function calculateOptimisticVote(
	current: VoteState,
	newVote: boolean,
): VoteState {
	if (current.isUpvote === newVote) {
		return {
			point: current.point - (newVote ? 1 : -1),
			isUpvote: undefined,
		};
	}

	if (current.isUpvote === undefined) {
		return {
			point: current.point + (newVote ? 1 : -1),
			isUpvote: newVote,
		};
	}

	return {
		point: current.point + (newVote ? 2 : -2),
		isUpvote: newVote,
	};
}

export function VoteButtons({ translation, onVoted }: VoteButtonsProps) {
	const [serverState, setServerState] = useState<VoteResponse>({
		success: true,
		data: {
			point: translation.point,
			isUpvote: translation.currentUserVoteIsUpvote ?? undefined,
		},
	});
	const [isPending, startTransition] = useTransition();

	// 現在の確定した状態を取得
	const currentState: VoteState =
		serverState.success && serverState.data
			? { point: serverState.data.point, isUpvote: serverState.data.isUpvote }
			: {
					point: translation.point,
					isUpvote: translation.currentUserVoteIsUpvote ?? undefined,
				};

	// useOptimisticで楽観的更新を管理
	const [optimisticState, addOptimistic] = useOptimistic(
		currentState,
		(current: VoteState, newVote: boolean) =>
			calculateOptimisticVote(current, newVote),
	);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const submitter = (event.nativeEvent as SubmitEvent).submitter;
		if (submitter?.getAttribute("name") === "isUpvote") {
			formData.set("isUpvote", submitter.getAttribute("value") ?? "");
		}
		const isUpvote = formData.get("isUpvote") === "true";

		startTransition(async () => {
			// 楽観的更新
			addOptimistic(isUpvote);

			try {
				const response = await fetch("/api/segment-translations", {
					method: "PATCH",
					body: formData,
					credentials: "same-origin",
				});

				if (response.status === 401) {
					window.location.assign("/auth/login");
					return;
				}

				const body = (await response.json()) as VoteResponse;
				setServerState(body);
				if (response.ok && body.success) {
					onVoted?.();
				}
			} catch {
				setServerState({ success: false });
			}
		});
	};

	return (
		<span className="flex h-full justify-end items-center">
			<form onSubmit={handleSubmit}>
				<input
					name="segmentTranslationId"
					type="hidden"
					value={translation.id}
				/>
				<span className="flex h-8">
					<VoteButton
						isActive={optimisticState.isUpvote}
						isVoting={isPending}
						type="upvote"
						voteCount={optimisticState.point}
					>
						{({ iconClass }) => <ThumbsUp className={iconClass} />}
					</VoteButton>
					<VoteButton
						isActive={optimisticState.isUpvote === false}
						isVoting={isPending}
						type="downvote"
					>
						{({ iconClass }) => <ThumbsDown className={iconClass} />}
					</VoteButton>
				</span>
			</form>
		</span>
	);
}
