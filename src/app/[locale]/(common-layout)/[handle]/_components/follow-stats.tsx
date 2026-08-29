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
	locale: string;
}

export function FollowStats({
	followingCount,
	followersCount,
	followingList,
	followerList,
	locale,
}: FollowStatsProps) {
	const [openFollowing, setOpenFollowing] = useState(false);
	const [openFollowers, setOpenFollowers] = useState(false);

	return (
		<div className="flex gap-4 mt-2 text-sm text-gray-500">
			<button
				className="cursor-pointer"
				onClick={() => setOpenFollowing(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						setOpenFollowing(true);
					}
				}}
				type="button"
			>
				{followingCount} following
			</button>
			<button
				className="cursor-pointer"
				onClick={() => setOpenFollowers(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						setOpenFollowers(true);
					}
				}}
				type="button"
			>
				{followersCount} followers
			</button>

			<FollowListDialog
				locale={locale}
				onOpenChange={setOpenFollowing}
				open={openFollowing}
				type="following"
				users={followingList}
			/>

			<FollowListDialog
				locale={locale}
				onOpenChange={setOpenFollowers}
				open={openFollowers}
				type="followers"
				users={followerList}
			/>
		</div>
	);
}
