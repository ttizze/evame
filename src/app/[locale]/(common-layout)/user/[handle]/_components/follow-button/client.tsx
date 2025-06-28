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
			<input name="targetUserId" type="hidden" value={targetUserId} />
			<input
				name="action"
				type="hidden"
				value={
					state.success
						? state.data?.isFollowing
							? "unFollow"
							: "follow"
						: "follow"
				}
			/>
			<Button
				className="rounded-full"
				disabled={isPending}
				variant={
					state.success
						? state.data?.isFollowing
							? "outline"
							: "default"
						: "default"
				}
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
