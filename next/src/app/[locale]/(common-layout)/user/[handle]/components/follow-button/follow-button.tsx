"use client";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { followAction } from "./action";

interface FollowButtonProps {
	targetUserId: string;
	isFollowing: boolean;
	className?: string;
}

function FollowButton({
	targetUserId,
	isFollowing,
	className,
}: FollowButtonProps) {
	const [state, formAction, isPending] = useActionState<
		ActionResponse,
		FormData
	>(followAction, { success: false });

	return (
		<form action={formAction}>
			<input type="hidden" name="targetUserId" value={targetUserId} />
			<input
				type="hidden"
				name="action"
				value={isFollowing ? "unfollow" : "follow"}
			/>
			<Button
				variant={isFollowing ? "outline" : "default"}
				className={className}
				disabled={isPending}
			>
				{isFollowing ? "Following" : "Follow"}
			</Button>
		</form>
	);
}

export { FollowButton };
