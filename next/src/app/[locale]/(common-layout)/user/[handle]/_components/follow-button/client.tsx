"use client";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { type FollowActionResponse, followAction } from "./action";

interface FollowButtonProps {
	targetUserId: string;
	isFollowing: boolean;
}

export function FollowButtonClient({
	targetUserId,
	isFollowing,
}: FollowButtonProps) {
	const [state, formAction, isPending] = useActionState<
		FollowActionResponse,
		FormData
	>(followAction, { success: false, data: { isFollowing } });

	return (
		<form action={formAction}>
			<input type="hidden" name="targetUserId" value={targetUserId} />
			<input
				type="hidden"
				name="action"
				value={state.data?.isFollowing ? "unFollow" : "follow"}
			/>
			<Button
				variant={state.data?.isFollowing ? "outline" : "default"}
				className="rounded-full"
				disabled={isPending}
			>
				{state.data?.isFollowing ? "Following" : "Follow"}
			</Button>
			{state.message && <p>{state.message}</p>}
		</form>
	);
}
