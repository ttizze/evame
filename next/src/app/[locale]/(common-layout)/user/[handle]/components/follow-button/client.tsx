"use client";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { type FollowActionResponse, followAction } from "./action";

interface FollowButtonProps {
	targetUserHandle: string;
	isFollowing: boolean;
}

export function FollowButtonClient({
	targetUserHandle,
	isFollowing,
}: FollowButtonProps) {
	const [state, formAction, isPending] = useActionState<
		FollowActionResponse,
		FormData
	>(followAction, { success: false, data: { isFollowing } });

	return (
		<form action={formAction}>
			<input type="hidden" name="targetUserHandle" value={targetUserHandle} />
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
