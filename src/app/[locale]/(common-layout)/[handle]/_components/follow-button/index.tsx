import { FollowButtonClient } from "./client";

export function FollowButton({
	isFollowing,
	locale = "en",
	targetUserId,
}: {
	isFollowing: boolean;
	locale?: string;
	targetUserId: string;
}) {
	return (
		<div>
			<FollowButtonClient
				isFollowing={isFollowing}
				locale={locale}
				targetUserId={targetUserId}
			/>
		</div>
	);
}
