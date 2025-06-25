'use client';

import { useState } from 'react';
import { FollowListDialog } from './follow-list-dialog';

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
    <div className="mt-2 flex gap-4 text-gray-500 text-sm">
      <button
        className="cursor-pointer"
        onClick={() => setOpenFollowing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
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
          if (e.key === 'Enter') {
            setOpenFollowers(true);
          }
        }}
        type="button"
      >
        {followersCount} followers
      </button>

      <FollowListDialog
        onOpenChange={setOpenFollowing}
        open={openFollowing}
        type="following"
        users={followingList}
      />

      <FollowListDialog
        onOpenChange={setOpenFollowers}
        open={openFollowers}
        type="followers"
        users={followerList}
      />
    </div>
  );
}
