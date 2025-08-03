import { getCurrentUser } from "@/lib/auth-server";
import { FollowButtonClient } from "./client";
import { isFollowing } from "./db/queries.server";

interface FollowButtonProps {
	targetUserId: string;
}

export async function FollowButton({ targetUserId }: FollowButtonProps) {
	const currentUser = await getCurrentUser();
	const isCurrentUserFollowing = currentUser?.id
		? await isFollowing(currentUser.id, targetUserId)
		: false;
	return (
		<div>
			<FollowButtonClient
				isFollowing={isCurrentUserFollowing}
				targetUserId={targetUserId}
			/>
		</div>
	);
}
