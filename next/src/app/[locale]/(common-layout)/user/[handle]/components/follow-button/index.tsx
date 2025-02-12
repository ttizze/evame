import { getCurrentUser } from "@/auth";
import { FollowButtonClient } from "./client";
import { isFollowing } from "./db/queries.server";
interface FollowButtonProps {
	targetUserHandle: string;
}

export async function FollowButton({ targetUserHandle }: FollowButtonProps) {
	const currentUser = await getCurrentUser();
	const isCurrentUserFollowing = currentUser?.handle
		? await isFollowing(currentUser.handle, targetUserHandle)
		: false;
	return (
		<div>
			<FollowButtonClient
				targetUserHandle={targetUserHandle}
				isFollowing={isCurrentUserFollowing}
			/>
		</div>
	);
}
