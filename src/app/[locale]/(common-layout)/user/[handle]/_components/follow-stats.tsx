"use client";

import { useState } from "react";
import { FollowListDialog } from "./follow-list-dialog";

interface User {
	handle: string;
	name: string;
	image: string;
}

interface FollowStatsProps {
	followingCount: number;
	followersCount: number;
	followingList: User[];
	followerList: User[];
}

export function FollowStats({
	followingCount,
	followersCount,
	followingList,
	followerList,
}: FollowStatsProps) {
	const [openFollowing, setOpenFollowing] = useState(false);
	const [openFollowers, setOpenFollowers] = useState(false);

	return (
		<div className="flex gap-4 mt-2 text-sm text-gray-500">
			<button
				type="button"
				onClick={() => setOpenFollowing(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						setOpenFollowing(true);
					}
				}}
				className="cursor-pointer"
			>
				{followingCount} following
			</button>
			<button
				type="button"
				onClick={() => setOpenFollowers(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						setOpenFollowers(true);
					}
				}}
				className="cursor-pointer"
			>
				{followersCount} followers
			</button>

			<FollowListDialog
				open={openFollowing}
				onOpenChange={setOpenFollowing}
				users={followingList}
				type="following"
			/>

			<FollowListDialog
				open={openFollowers}
				onOpenChange={setOpenFollowers}
				users={followerList}
				type="followers"
			/>
		</div>
	);
}
