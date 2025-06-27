"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
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
	>(followAction, { success: true, data: { isFollowing } });

	return (
		<form action={formAction}>
			<input type="hidden" name="targetUserId" value={targetUserId} />
			<input
				type="hidden"
				name="action"
				value={
					state.success
						? state.data?.isFollowing
							? "unFollow"
							: "follow"
						: "follow"
				}
			/>
			<Button
				variant={
					state.success
						? state.data?.isFollowing
							? "outline"
							: "default"
						: "default"
				}
				className="rounded-full"
				disabled={isPending}
			>
				{state.success
					? state.data?.isFollowing
						? "Following"
						: "Follow"
					: "Follow"}
			</Button>
			{state.message && <p>{state.message}</p>}
		</form>
	);
}
